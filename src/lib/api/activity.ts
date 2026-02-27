import { after } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

/**
 * Fire-and-forget update of a user's lastActiveAt timestamp.
 * Uses next/server `after()` to keep the function alive past the response.
 */
export function touchLastActive(userId: string, route: string) {
  after(
    prisma.profile
      .update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      })
      .catch((err) => {
        logger.warn('Failed to update lastActiveAt', route, {
          error: err instanceof Error ? err.message : String(err),
        });
      })
  );
}
