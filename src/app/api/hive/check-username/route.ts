import { createApiHandler, apiSuccess, apiError } from '@/lib/api/response';
import { isValidHiveUsername, checkUsernameAvailability } from '@/lib/hive/username';

export const GET = createApiHandler('/api/hive/check-username', async (request: Request) => {
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
