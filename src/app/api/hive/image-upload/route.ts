import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { validateCsrf, csrfError } from '@/lib/api/csrf';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { createRequestContext } from '@/lib/api/response';
import { uploadBufferToHiveImageHost } from '@/lib/hive/hive-image-host';

const ROUTE = '/api/hive/image-upload';

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
    const fileName = (file as File).name || 'image.png';
    const mimeType = (file as File).type || 'image/png';

    const result = await uploadBufferToHiveImageHost(imageData, fileName, mimeType);

    if (result.success && result.url) {
      return NextResponse.json({ url: result.url });
    }

    return NextResponse.json(
      { error: result.error || 'Upload failed' },
      { status: result.error?.includes('not configured') ? 503 : 502 }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
