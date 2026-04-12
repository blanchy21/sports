import { prisma } from '@/lib/db/prisma';

/**
 * Resolve a community URL param (either a DB id OR a slug) to the canonical
 * community record. Returns null if neither lookup matches.
 */
export async function resolveCommunity(idOrSlug: string) {
  const byId = await prisma.community.findUnique({ where: { id: idOrSlug } });
  if (byId) return byId;
  return prisma.community.findUnique({ where: { slug: idOrSlug } });
}
