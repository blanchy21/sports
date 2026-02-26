import { prisma } from '@/lib/db/prisma';

export interface CommunityData {
  id: string;
  name: string;
  slug: string;
  about: string | null;
  description: string | null;
  sportCategory: string | null;
  avatar: string | null;
  coverImage: string | null;
  memberCount: number;
  type: string;
}

export async function getCommunity(id: string): Promise<CommunityData | null> {
  try {
    let community = await prisma.community.findUnique({ where: { id } });
    if (!community) {
      community = await prisma.community.findUnique({ where: { slug: id } });
    }
    return community as CommunityData | null;
  } catch {
    return null;
  }
}
