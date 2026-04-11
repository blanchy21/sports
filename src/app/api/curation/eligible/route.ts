/**
 * Curation Eligible Posts API
 *
 * GET: Returns recent community posts that have the sportsblock 5% beneficiary,
 * joined with curation status and engagement metrics.
 *
 * Query params:
 *   ?limit=20           — max posts (default 20, max 50)
 *   ?curated=true/false — filter by curation status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { isCuratorAsync } from '@/lib/rewards/curator-rewards';
import { requireAdmin } from '@/lib/admin/config';
import { hasSportsblockBeneficiary } from '@/lib/curation/eligibility';
import { prisma } from '@/lib/db/prisma';
import { SPORTS_ARENA_CONFIG } from '@/lib/hive-workerbee/client';
import { parseJsonMetadata } from '@/lib/utils/hive';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/curation/eligible';

interface HivePost {
  author: string;
  permlink: string;
  title: string;
  created: string;
  category: string;
  parent_author: string;
  beneficiaries: Array<{ account: string; weight: number }>;
  json_metadata: string;
  net_votes: number;
  children: number;
  pending_payout_value: string;
}

export const GET = createApiHandler(ROUTE, async (request) => {
  // Auth: must be admin or curator
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const isAdmin = requireAdmin(user);
  const isCurator = await isCuratorAsync(user.username);
  if (!isAdmin && !isCurator) {
    return NextResponse.json(
      { success: false, error: 'Curator or admin access required' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);
  const curatedFilter = searchParams.get('curated');

  // Fetch recent community posts from Hive
  const posts = await fetchRecentCommunityPosts(limit * 3); // Over-fetch to compensate for filtering

  // Filter to posts with sportsblock beneficiary
  const eligiblePosts = posts.filter(
    (p) =>
      hasSportsblockBeneficiary(p.beneficiaries) &&
      p.parent_author === '' &&
      p.category === SPORTS_ARENA_CONFIG.COMMUNITY_ID
  );

  // Get curation status for all eligible posts
  const postKeys = eligiblePosts.map((p) => ({ author: p.author, permlink: p.permlink }));

  const curations =
    postKeys.length > 0
      ? await prisma.curation.findMany({
          where: {
            OR: postKeys.map((pk) => ({ author: pk.author, permlink: pk.permlink })),
            status: 'completed',
          },
          select: {
            author: true,
            permlink: true,
            curatorUsername: true,
            amount: true,
            createdAt: true,
          },
        })
      : [];

  // Build curation map
  const curationMap = new Map<string, typeof curations>();
  for (const c of curations) {
    const key = `${c.author}/${c.permlink}`;
    if (!curationMap.has(key)) curationMap.set(key, []);
    curationMap.get(key)!.push(c);
  }

  // Get engagement metrics from PostMetric
  const metrics =
    postKeys.length > 0
      ? await prisma.postMetric.findMany({
          where: {
            OR: postKeys.map((pk) => ({ author: pk.author, permlink: pk.permlink })),
          },
          select: {
            author: true,
            permlink: true,
            views: true,
            uniqueViews: true,
            votes: true,
            comments: true,
            totalEngagement: true,
          },
        })
      : [];

  const metricMap = new Map<string, (typeof metrics)[0]>();
  for (const m of metrics) {
    metricMap.set(`${m.author}/${m.permlink}`, m);
  }

  // Build response
  let result = eligiblePosts.map((post) => {
    const key = `${post.author}/${post.permlink}`;
    const postCurations = curationMap.get(key) || [];
    const metric = metricMap.get(key);
    const metadata = parseJsonMetadata(post.json_metadata || '');

    return {
      author: post.author,
      permlink: post.permlink,
      title: post.title,
      created: post.created,
      netVotes: post.net_votes,
      comments: post.children,
      pendingPayout: post.pending_payout_value,
      sportCategory: (metadata.sport_category as string) || null,
      curated: postCurations.length > 0,
      totalMedalsCurated: postCurations.reduce((sum, c) => sum + Number(c.amount), 0),
      curators: postCurations.map((c) => ({
        username: c.curatorUsername,
        amount: Number(c.amount),
        curatedAt: c.createdAt.toISOString(),
      })),
      engagement: metric
        ? {
            views: metric.views,
            uniqueViews: metric.uniqueViews,
            votes: metric.votes,
            comments: metric.comments,
            totalEngagement: metric.totalEngagement,
          }
        : null,
    };
  });

  // Apply curated filter
  if (curatedFilter === 'true') {
    result = result.filter((p) => p.curated);
  } else if (curatedFilter === 'false') {
    result = result.filter((p) => !p.curated);
  }

  return NextResponse.json({
    success: true,
    posts: result.slice(0, limit),
    total: result.length,
  });
});

/**
 * Fetch recent posts from the sportsblock community via Hive API.
 */
async function fetchRecentCommunityPosts(limit: number): Promise<HivePost[]> {
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_HIVE_API_URL || 'https://api.hive.blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_discussions_by_created',
        params: [
          {
            tag: SPORTS_ARENA_CONFIG.COMMUNITY_ID,
            limit: Math.min(limit, 100),
          },
        ],
        id: 1,
      }),
    });

    if (!response.ok) {
      logger.error(`Hive API returned ${response.status}`, 'curation:eligible');
      return [];
    }

    const data = await response.json();
    return (data.result || []) as HivePost[];
  } catch (error) {
    logger.error('Failed to fetch community posts', 'curation:eligible', error);
    return [];
  }
}
