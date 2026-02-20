import { NextRequest } from 'next/server';
import { createApiHandler, apiSuccess, apiError } from '@/lib/api/response';
import { isValidHiveUsername, checkUsernameAvailability } from '@/lib/hive/username';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';

export const GET = createApiHandler('/api/hive/check-username', async (request: Request, ctx) => {
  // Require authentication — only custodial users picking a username should call this
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) {
    return apiError('Authentication required', 'UNAUTHORIZED', 401, {
      requestId: ctx.requestId,
    });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username')?.toLowerCase().trim();

  if (!username) {
    return apiError('username query parameter is required', 'VALIDATION_ERROR', 400);
  }

  const validation = isValidHiveUsername(username);

  if (!validation.valid) {
    return apiSuccess({
      username,
      valid: false,
      available: false,
      reason: validation.reason,
    });
  }

  const available = await checkUsernameAvailability(username);

  return apiSuccess({
    username,
    valid: true,
    available,
    reason: available ? undefined : 'This username is already taken',
  });
});
