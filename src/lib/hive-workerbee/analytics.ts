import { SportsblockPost } from './content';
import { SPORT_CATEGORIES } from '@/types';
import { getFollowerCount } from './social';
import { Sportsbite, extractHashtags } from './sportsbites';

// Types for analytics data
export interface TrendingSport {
  sport: {
    id: string;
    name: string;
    icon: string;
  };
  posts: number;
  trending: boolean;
}

export interface TrendingTopic {
  id: string;
  name: string;
  posts: number;
}

export interface TopAuthor {
  id: string;
  username: string;
  displayName: string;
  posts: number;
  engagement: number;
  followers?: string; // We'll keep this as formatted string for now
}

export interface CommunityStats {
  totalPosts: number;
  totalAuthors: number;
  totalRewards: number;
  activeToday: number;
}

// Utility function to parse JSON metadata
function parseJsonMetadata(jsonMetadata: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

// Utility function to check if a tag is a sport category
function isSportCategory(tag: string): boolean {
  return SPORT_CATEGORIES.some(
    (sport) =>
      sport.id === tag || sport.name.toLowerCase() === tag.toLowerCase() || sport.slug === tag
  );
}

// Utility function to filter posts to last 7 days
function filterPostsLast7Days(posts: SportsblockPost[]): SportsblockPost[] {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return posts.filter((post) => {
    const postDate = new Date(post.created);
    return postDate >= sevenDaysAgo;
  });
}

/**
 * Calculate trending sports based on sport category tags
 * @param posts - Array of posts to analyze
 * @param sportsbites - Optional sportsbites to include in the count
 * @returns Trending sports data
 */
export function calculateTrendingSports(
  posts: SportsblockPost[],
  sportsbites?: Sportsbite[]
): TrendingSport[] {
  const recentPosts = filterPostsLast7Days(posts);
  const sportCount: Record<string, number> = {};

  // Count posts by sport category
  recentPosts.forEach((post) => {
    if (post.sportCategory) {
      sportCount[post.sportCategory] = (sportCount[post.sportCategory] || 0) + 1;
    }
  });

  // Count sportsbites by sport category
  if (sportsbites) {
    for (const bite of sportsbites) {
      if (bite.sportCategory) {
        sportCount[bite.sportCategory] = (sportCount[bite.sportCategory] || 0) + 1;
      }
    }
  }

  // Convert to array and sort by count
  const sortedSports = Object.entries(sportCount)
    .map(([sportId, count]) => {
      const sport = SPORT_CATEGORIES.find((s) => s.id === sportId);
      if (!sport) return null;

      return {
        sport: {
          id: sport.id,
          name: sport.name,
          icon: sport.icon,
        },
        posts: count,
        trending: false, // Will be set below
      };
    })
    .filter((item): item is TrendingSport => item !== null)
    .sort((a, b) => b.posts - a.posts);

  // Mark top 3 as trending
  sortedSports.forEach((item, index) => {
    if (index < 3) {
      item.trending = true;
    }
  });

  return sortedSports;
}

/**
 * Calculate trending topics based on hashtags/tags
 * @param posts - Array of posts to analyze
 * @returns Trending topics data
 */
export function calculateTrendingTopics(posts: SportsblockPost[]): TrendingTopic[] {
  const recentPosts = filterPostsLast7Days(posts);
  const tagCount: Record<string, number> = {};

  // Count all tags except sport categories and system tags
  recentPosts.forEach((post) => {
    const metadata = parseJsonMetadata(post.json_metadata);
    const tags = metadata.tags as string[] | undefined;

    if (tags && Array.isArray(tags)) {
      tags.forEach((tag) => {
        // Filter out sport categories, system tags, and empty tags
        if (
          tag &&
          !isSportCategory(tag) &&
          tag !== 'sportsblock' &&
          tag !== 'sportsarena' &&
          tag !== 'hive-115814' &&
          tag.length > 1
        ) {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        }
      });
    }
  });

  // Convert to array, sort by count, and return top 5
  return Object.entries(tagCount)
    .map(([tag, count]) => ({
      id: tag,
      name: tag,
      posts: count,
    }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 5);
}

/**
 * Calculate trending topics from sportsbite body text hashtags.
 * Parses #hashtag patterns from the body of each sportsbite.
 */
export function calculateSportsbitesTrendingTopics(sportsbites: Sportsbite[]): TrendingTopic[] {
  const tagCount: Record<string, number> = {};

  for (const bite of sportsbites) {
    const hashtags = extractHashtags(bite.body);
    for (const tag of hashtags) {
      if (!isSportCategory(tag)) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    }
  }

  return Object.entries(tagCount)
    .map(([tag, count]) => ({
      id: tag,
      name: tag,
      posts: count,
    }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 5);
}

/**
 * Format follower count as "X.XK" string
 */
function formatFollowerCount(count: number): string {
  if (count >= 1000) {
    const thousands = count / 1000;
    return `${thousands.toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Calculate top authors based on engagement (comments + votes)
 * @param posts - Array of posts to analyze
 * @param excludeUser - Username to exclude from the results (e.g., current user)
 * @param sportsbites - Optional sportsbites to include in the count
 * @returns Top authors data with real follower counts
 */
export async function calculateTopAuthors(
  posts: SportsblockPost[],
  excludeUser?: string,
  sportsbites?: Sportsbite[]
): Promise<TopAuthor[]> {
  const recentPosts = filterPostsLast7Days(posts);
  const authorStats: Record<
    string,
    {
      username: string;
      posts: number;
      totalEngagement: number;
      totalComments: number;
      totalVotes: number;
    }
  > = {};

  // Calculate engagement for each author from long-form posts
  recentPosts.forEach((post) => {
    const author = post.author;

    // Skip posts with empty or invalid author
    if (!author || typeof author !== 'string' || author.trim() === '') {
      return;
    }

    // Skip the excluded user
    if (excludeUser && author === excludeUser) {
      return;
    }

    if (!authorStats[author]) {
      authorStats[author] = {
        username: author,
        posts: 0,
        totalEngagement: 0,
        totalComments: 0,
        totalVotes: 0,
      };
    }

    const stats = authorStats[author];
    stats.posts += 1;
    stats.totalComments += post.children || 0;
    stats.totalVotes += post.net_votes || 0;

    // Engagement score: comments × 2 + net_votes
    stats.totalEngagement += (post.children || 0) * 2 + (post.net_votes || 0);
  });

  // Also count sportsbites
  if (sportsbites) {
    for (const bite of sportsbites) {
      const author = bite.author;
      if (!author || author.trim() === '') continue;
      if (excludeUser && author === excludeUser) continue;

      if (!authorStats[author]) {
        authorStats[author] = {
          username: author,
          posts: 0,
          totalEngagement: 0,
          totalComments: 0,
          totalVotes: 0,
        };
      }

      const stats = authorStats[author];
      stats.posts += 1;
      stats.totalComments += bite.children || 0;
      stats.totalVotes += bite.net_votes || 0;
      stats.totalEngagement += (bite.children || 0) * 2 + (bite.net_votes || 0);
    }
  }

  // Get top 3 authors by engagement (filter out any empty usernames as safety check)
  const topAuthors = Object.values(authorStats)
    .filter((author) => author.username && author.username.trim() !== '')
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
    .slice(0, 3);

  // Fetch real follower counts in parallel
  const followerCounts = await Promise.all(
    topAuthors.map((author) => getFollowerCount(author.username))
  );

  // Map to TopAuthor format with real follower counts
  return topAuthors.map((stats, index) => ({
    id: `author-${index + 1}`,
    username: stats.username,
    displayName: stats.username,
    posts: stats.posts,
    engagement: stats.totalEngagement,
    followers: formatFollowerCount(followerCounts[index]),
  }));
}

/**
 * Calculate community statistics
 * @param posts - Array of posts to analyze
 * @param sportsbites - Optional sportsbites to include in the stats
 * @returns Community stats data
 */
export function calculateCommunityStats(
  posts: SportsblockPost[],
  sportsbites?: Sportsbite[]
): CommunityStats {
  const recentPosts = filterPostsLast7Days(posts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate unique authors
  const uniqueAuthors = new Set(recentPosts.map((post) => post.author));

  // Include sportsbite authors
  if (sportsbites) {
    for (const bite of sportsbites) {
      if (bite.author) uniqueAuthors.add(bite.author);
    }
  }

  // Calculate total rewards (pending payouts)
  const totalRewards = recentPosts.reduce((sum, post) => {
    const payout = parseFloat(post.pending_payout_value || '0');
    return sum + payout;
  }, 0);

  // Calculate posts from today (long-form + sportsbites)
  let activeToday = recentPosts.filter((post) => {
    const postDate = new Date(post.created);
    postDate.setHours(0, 0, 0, 0);
    return postDate.getTime() === today.getTime();
  }).length;

  if (sportsbites) {
    activeToday += sportsbites.filter((bite) => {
      const biteDate = new Date(bite.created);
      biteDate.setHours(0, 0, 0, 0);
      return biteDate.getTime() === today.getTime();
    }).length;
  }

  return {
    totalPosts: recentPosts.length + (sportsbites?.length || 0),
    totalAuthors: uniqueAuthors.size,
    totalRewards,
    activeToday,
  };
}

/**
 * Get all analytics data for the sidebar
 * @param posts - Array of posts to analyze
 * @param excludeUser - Username to exclude from top authors (e.g., current user)
 * @param sportsbites - Optional sportsbites to derive trending topics from
 * @returns Complete analytics data
 */
export async function getAnalyticsData(
  posts: SportsblockPost[],
  excludeUser?: string,
  sportsbites?: Sportsbite[]
) {
  const [topAuthors] = await Promise.all([calculateTopAuthors(posts, excludeUser, sportsbites)]);

  // Prefer sportsbite body hashtags; supplement with long-form post tags if < 5
  let trendingTopics: TrendingTopic[] = [];
  if (sportsbites && sportsbites.length > 0) {
    trendingTopics = calculateSportsbitesTrendingTopics(sportsbites);
  }
  if (trendingTopics.length < 5) {
    const postTopics = calculateTrendingTopics(posts);
    const existingIds = new Set(trendingTopics.map((t) => t.id));
    for (const topic of postTopics) {
      if (!existingIds.has(topic.id)) {
        trendingTopics.push(topic);
        if (trendingTopics.length >= 5) break;
      }
    }
  }

  return {
    trendingSports: calculateTrendingSports(posts, sportsbites),
    trendingTopics,
    topAuthors,
    communityStats: calculateCommunityStats(posts, sportsbites),
  };
}
