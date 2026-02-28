import { NextRequest, NextResponse } from 'next/server';
import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { validateCsrf, csrfError } from '@/lib/api/csrf';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { createRequestContext } from '@/lib/api/response';
import { logger } from '@/lib/logger';

const ROUTE = '/api/hive/image-upload';

const IMAGE_HOSTS = ['https://images.hive.blog', 'https://images.ecency.com'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  // CSRF protection
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  // Require authenticated user
  const user = await getAuthenticatedUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Rate limit: 10 uploads per minute per user
  const rateLimit = await checkRateLimit(
    `image-upload:${user.userId}`,
    { limit: 10, windowSeconds: 60 },
    'image-upload'
  );
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Upload rate limit exceeded. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.reset / 1000)) } }
    );
  }

  const account = process.env.HIVE_IMAGE_UPLOAD_ACCOUNT;
  const key = process.env.HIVE_IMAGE_UPLOAD_KEY;

  if (!account || !key) {
    return NextResponse.json({ error: 'Image upload is not configured.' }, { status: 503 });
  }

  const ctx = createRequestContext(ROUTE);
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Validate file type
    const fileType = (file as File).type;
    if (fileType && !ALLOWED_IMAGE_TYPES.includes(fileType)) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const imageData = Buffer.from(arrayBuffer);

    // Create the signing challenge: SHA-256("ImageSigningChallenge" + imageData)
    const prefix = Buffer.from('ImageSigningChallenge');
    const challengeBuffer = Buffer.concat([prefix, imageData]);
    const hash = cryptoUtils.sha256(challengeBuffer);

    // Sign the hash with the service account's posting key
    const privateKey = PrivateKey.fromString(key);
    const signature = privateKey.sign(hash).toString();

    // Try each image host until one succeeds
    const fileName = (file as File).name || 'image.png';
    const mimeType = (file as File).type || 'image/png';
    let lastStatus = 0;
    let lastError = '';

    for (const host of IMAGE_HOSTS) {
      try {
        const uploadFormData = new FormData();
        const blob = new Blob([imageData], { type: mimeType });
        uploadFormData.append('file', blob, fileName);

        const uploadUrl = `${host}/${account}/${signature}`;
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: uploadFormData,
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          lastStatus = response.status;
          lastError = await response.text().catch(() => '');
          logger.error(
            `Image upload to ${host} failed: ${response.status} ${lastError}`,
            'image-upload'
          );
          continue;
        }

        const result = await response.json();
        if (result.url) {
          return NextResponse.json({ url: result.url });
        }

        lastError = 'No URL in response';
        continue;
      } catch (err) {
        logger.error(`Image upload to ${host} error`, 'image-upload', err);
        lastError = err instanceof Error ? err.message : 'Unknown error';
        continue;
      }
    }

    return NextResponse.json(
      { error: `All image hosts failed (last: ${lastStatus || lastError})` },
      { status: 502 }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
