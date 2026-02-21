/**
 * Auth-related types for soft user content.
 *
 * Canonical types live elsewhere:
 *   User        -> @/types/user
 *   AuthType    -> @/types/ui
 *   AuthState   -> @/types/ui
 *   HivePost    -> @/lib/shared/types
 *   AiohaInstance -> @/lib/aioha/types
 */

// Post types for soft (custodial) system
export interface SoftPost {
  id: string;
  authorId: string;
  // Author profile data for display
  authorUsername: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  // Post content
  title: string;
  content: string;
  excerpt?: string;
  permlink: string;
  tags: string[];
  sportCategory?: string;
  featuredImage?: string;
  // Community data (optional)
  communityId?: string;
  communitySlug?: string;
  communityName?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  // Hive integration
  isPublishedToHive: boolean;
  hivePermlink?: string;
  // Engagement (soft tracking - no rewards)
  viewCount?: number;
  likeCount?: number;
}

// Soft sportsbite stored in database
export interface SoftSportsbite {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  body: string;
  sportCategory?: string;
  images?: string[];
  gifs?: string[];
  matchThreadId?: string;
  poll?: { question: string; options: [string, string] };
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  commentCount: number;
  isDeleted: boolean;
}
