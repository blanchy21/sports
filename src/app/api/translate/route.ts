import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createApiHandler } from '@/lib/api/response';
import { apiSuccess } from '@/lib/api/response';
import { ApiError } from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { cached } from '@/lib/cache';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/utils/rate-limit';

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';
const MAX_TEXT_LENGTH = 1000; // generous limit (sportsbites are 280 max)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface TranslateResponse {
  translatedText: string;
  detectedLanguage: string;
}

const translateSchema = z.object({
  text: z.string().trim().min(1, 'text is required').max(MAX_TEXT_LENGTH),
  targetLang: z.string().min(2).max(10).default('en'),
});

export const POST = createApiHandler('/api/translate', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    if (!GOOGLE_TRANSLATE_API_KEY) {
      throw new ApiError('Translation service not configured', 'INTERNAL_ERROR', 503);
    }

    // Authentication required — the Google Translate API is billed per call.
    // Anonymous callers could burn the quota by rotating IPs past the
    // per-IP rate limit below.
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) {
      throw new ApiError('Authentication required', 'UNAUTHORIZED', 401);
    }

    // Per-user rate limit (primary guard) + per-IP rate limit (secondary).
    const userRateLimit = await checkRateLimit(
      `translate:user:${user.userId}`,
      RATE_LIMITS.read,
      'translate'
    );
    if (!userRateLimit.success) {
      throw new ApiError('Too many translation requests', 'RATE_LIMITED', 429);
    }
    const ipRateLimit = await checkRateLimit(
      `translate:ip:${getClientIdentifier(request)}`,
      RATE_LIMITS.read,
      'translate'
    );
    if (!ipRateLimit.success) {
      throw new ApiError('Too many translation requests from this network', 'RATE_LIMITED', 429);
    }

    let parsed;
    try {
      parsed = translateSchema.parse(await request.json());
    } catch (err) {
      const message = err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request body';
      throw new ApiError(message ?? 'Invalid request body', 'VALIDATION_ERROR', 400);
    }
    const { text, targetLang } = parsed;

    // Cache key based on content hash + target language
    const hash = createHash('sha256').update(text).digest('hex').slice(0, 16);
    const cacheKey = `translate:${hash}:${targetLang}`;

    const result = await cached<TranslateResponse>(
      cacheKey,
      async () => {
        ctx.log.info('Calling Google Translate API', { targetLang, textLength: text.length });

        const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            target: targetLang,
            format: 'text',
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'unknown');
          ctx.log.error('Google Translate API error', new Error(errorBody), {
            status: response.status,
          });
          throw new ApiError('Translation failed', 'UPSTREAM_ERROR', 502);
        }

        const data = await response.json();
        const translation = data?.data?.translations?.[0];

        if (!translation?.translatedText) {
          throw new ApiError('Unexpected translation response', 'UPSTREAM_ERROR', 502);
        }

        return {
          translatedText: translation.translatedText,
          detectedLanguage: translation.detectedSourceLanguage || 'unknown',
        };
      },
      { ttl: CACHE_TTL_MS, tags: ['translate'] }
    );

    return apiSuccess(result);
  });
});
