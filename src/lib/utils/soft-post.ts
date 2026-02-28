/**
 * Strips the "soft-" prefix from a soft post/sportsbite/comment ID.
 * Soft entities use IDs like "soft-{uuid}" in URLs and API payloads,
 * but the underlying Prisma record uses the raw UUID.
 */
export function stripSoftPrefix(id: string): string {
  return id.replace('soft-', '');
}
