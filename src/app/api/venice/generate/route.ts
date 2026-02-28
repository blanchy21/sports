import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createApiHandler, apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { validateCsrf } from '@/lib/api/csrf';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { uploadBufferToHiveImageHost } from '@/lib/hive/hive-image-host';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const promptSchema = z.object({
  prompt: z
    .string()
    .min(3, 'Prompt must be at least 3 characters')
    .max(500, 'Prompt must be at most 500 characters'),
});

// ---------------------------------------------------------------------------
// POST /api/venice/generate
// ---------------------------------------------------------------------------

export const POST = createApiHandler('/api/venice/generate', async (request: Request, ctx) => {
  // 1. CSRF protection
  if (!validateCsrf(request as NextRequest)) {
    return apiError('Request blocked: invalid origin', 'FORBIDDEN', 403, {
      requestId: ctx.requestId,
    });
  }

  // 2. Auth
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) {
    return apiError('Authentication required', 'UNAUTHORIZED', 401, {
      requestId: ctx.requestId,
    });
  }

  // 3. Rate limit: 10 generations per hour per user
  const rateLimit = await checkRateLimit(
    `venice-generate:${user.userId}`,
    { limit: 10, windowSeconds: 3600 },
    'venice-generate'
  );
  if (!rateLimit.success) {
    return apiError(
      'Generation rate limit exceeded (max 10/hour). Please try again later.',
      'RATE_LIMITED',
      429,
      {
        requestId: ctx.requestId,
        headers: { 'Retry-After': String(Math.ceil(rateLimit.reset / 1000)) },
      }
    );
  }

  // 4. Validate prompt
  const body = await request.json().catch(() => null);
  if (!body) {
    return apiError('Invalid JSON body', 'VALIDATION_ERROR', 400, {
      requestId: ctx.requestId,
    });
  }

  const parsed = promptSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ');
    return apiError(message, 'VALIDATION_ERROR', 400, {
      requestId: ctx.requestId,
    });
  }

  // 5. Check API key
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return apiError('AI image generation is not configured', 'INTERNAL_ERROR', 503, {
      requestId: ctx.requestId,
    });
  }

  // 6. Call Venice API
  ctx.log.info('Generating image', {
    userId: user.userId,
    promptLength: parsed.data.prompt.length,
  });

  let base64Image: string;
  try {
    const veniceResponse = await fetch('https://api.venice.ai/api/v1/image/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'fluently-xl',
        prompt: parsed.data.prompt,
        width: 1024,
        height: 576,
        format: 'png',
        safe_mode: true,
        hide_watermark: true,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!veniceResponse.ok) {
      const errorText = await veniceResponse.text().catch(() => '');
      ctx.log.error('Venice API error', undefined, {
        status: veniceResponse.status,
        body: errorText.slice(0, 500),
      });
      return apiError('Image generation failed', 'UPSTREAM_ERROR', 502, {
        requestId: ctx.requestId,
      });
    }

    // Check Venice safety headers
    const isBlurred = veniceResponse.headers.get('x-venice-is-blurred');
    const isViolation = veniceResponse.headers.get('x-venice-is-content-violation');
    if (isBlurred === 'true' || isViolation === 'true') {
      return apiError(
        'Image was flagged by content safety filter. Try a different prompt.',
        'VALIDATION_ERROR',
        422,
        { requestId: ctx.requestId }
      );
    }

    // Log balance for monitoring
    const balance = veniceResponse.headers.get('x-venice-balance-usd');
    if (balance) {
      ctx.log.info('Venice balance', { balanceUsd: balance });
    }

    const veniceData = await veniceResponse.json();
    base64Image = veniceData?.images?.[0] ?? veniceData?.data?.[0]?.b64_json;

    if (!base64Image) {
      ctx.log.error('No image in Venice response', undefined, {
        keys: Object.keys(veniceData),
      });
      return apiError('No image returned from AI', 'UPSTREAM_ERROR', 502, {
        requestId: ctx.requestId,
      });
    }
  } catch (err) {
    if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      return apiError('Image generation timed out', 'TIMEOUT', 504, {
        requestId: ctx.requestId,
      });
    }
    throw err;
  }

  // 7. Upload to Hive image host
  const imageBuffer = Buffer.from(base64Image, 'base64');
  const uploadResult = await uploadBufferToHiveImageHost(
    imageBuffer,
    `ai-generated-${Date.now()}.png`,
    'image/png'
  );

  if (!uploadResult.success || !uploadResult.url) {
    ctx.log.error('Hive image upload failed after generation', undefined, {
      error: uploadResult.error,
    });
    return apiError(
      uploadResult.error || 'Failed to upload generated image',
      'UPSTREAM_ERROR',
      502,
      { requestId: ctx.requestId }
    );
  }

  ctx.log.info('Image generated and uploaded', { url: uploadResult.url });

  return apiSuccess({ url: uploadResult.url });
});
