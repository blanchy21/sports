import { prisma } from './prisma';

/**
 * Sync denormalized author data (display name and/or avatar) across
 * Post, Comment, and Sportsbite tables when a user's profile changes.
 *
 * Only updates rows where the values actually differ, so this is
 * safe to call on every session refresh (no-op when nothing changed).
 *
 * Only provided fields are synced — omitted fields are left untouched.
 */
export async function syncAuthorData(
  username: string,
  data: { displayName?: string; avatar?: string }
): Promise<void> {
  // Build update payload from provided fields only
  const updateData: Record<string, string> = {};
  const notConditions: Record<string, string>[] = [];

  if (data.displayName !== undefined) {
    updateData.authorDisplayName = data.displayName;
    notConditions.push({ authorDisplayName: data.displayName });
  }

  if (data.avatar !== undefined) {
    updateData.authorAvatar = data.avatar;
    notConditions.push({ authorAvatar: data.avatar });
  }

  // Nothing to sync
  if (Object.keys(updateData).length === 0) return;

  // Match rows where ANY provided field differs from the new value
  const where = {
    authorUsername: username,
    NOT: notConditions.length === 1 ? notConditions[0] : { AND: notConditions },
  };

  await Promise.all([
    prisma.post.updateMany({ where, data: updateData }),
    prisma.comment.updateMany({ where, data: updateData }),
    prisma.sportsbite.updateMany({ where, data: updateData }),
  ]);
}
