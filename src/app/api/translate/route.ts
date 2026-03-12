import { createHash } from 'crypto';
import { createApiHandler } from '@/lib/api/response';
import { apiSuccess } from '@/lib/api/response';
import { ApiError } from '@/lib/api/response';
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

export const POST = createApiHandler('/api/translate', async (request, ctx) => {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new ApiError('Translation service not configured', 'INTERNAL_ERROR', 503);
  }

  // Rate limit
  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(`translate:${clientId}`, RATE_LIMITS.read, 'translate');
  if (!rateLimit.success) {
    throw new ApiError('Too many translation requests', 'RATE_LIMITED', 429);
  }

  const body = await request.json();
  const text = body?.text?.trim();
  const targetLang = body?.targetLang || 'en';

  if (!text || typeof text !== 'string') {
    throw new ApiError('text is required', 'VALIDATION_ERROR', 400);
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw new ApiError(`Text exceeds ${MAX_TEXT_LENGTH} characters`, 'VALIDATION_ERROR', 400);
  }

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
