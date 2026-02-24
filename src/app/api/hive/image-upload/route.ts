import { NextRequest, NextResponse } from 'next/server';
import { PrivateKey, cryptoUtils } from '@hiveio/dhive';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { validateCsrf, csrfError } from '@/lib/api/csrf';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { createRequestContext } from '@/lib/api/response';

const ROUTE = '/api/hive/image-upload';

const IMAGE_HOST = 'https://images.hive.blog';
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

    // Upload to images.hive.blog
    const uploadFormData = new FormData();
    const blob = new Blob([imageData], { type: (file as File).type || 'image/png' });
    uploadFormData.append('file', blob, (file as File).name || 'image.png');

    const uploadUrl = `${IMAGE_HOST}/${account}/${signature}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadFormData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Hive image upload failed:', response.status, text);
      return NextResponse.json(
        { error: `Image host returned ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();

    if (result.url) {
      return NextResponse.json({ url: result.url });
    }

    return NextResponse.json({ error: 'No URL in image host response' }, { status: 502 });
  } catch (error) {
    return ctx.handleError(error);
  }
}
