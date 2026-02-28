import { prisma } from './prisma';

/**
 * Sync denormalized authorDisplayName across Post, Comment, and Sportsbite
 * when a user's Hive profile display name changes.
 *
 * Only updates rows where the display name actually differs, so this is
 * safe to call on every session refresh (no-op when nothing changed).
 *
 * Hive usernames are immutable, so only display names need syncing.
 */
export async function syncDisplayName(username: string, newDisplayName: string): Promise<void> {
  const where = {
    authorUsername: username,
    NOT: { authorDisplayName: newDisplayName },
  };
  const data = { authorDisplayName: newDisplayName };

  await Promise.all([
    prisma.post.updateMany({ where, data }),
    prisma.comment.updateMany({ where, data }),
    prisma.sportsbite.updateMany({ where, data }),
  ]);
}
