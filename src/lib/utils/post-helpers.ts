/**
 * Post Type Helpers
 *
 * Type-safe utilities for working with Post, SportsblockPost, and DisplayPost union types.
 * These helpers eliminate unsafe type assertions throughout the codebase.
 */

import type { Post } from '@/types';
import type { SportsblockPost } from '@/lib/shared/types';

/**
 * Lightweight post type for rendering in feeds and lists.
 * Contains only the ~20 fields that UI components actually use,
 * avoiding the 50+ dummy fields previously faked via `as SportsblockPost` casts.
 */
export interface DisplayPost {
  postType: 'display';
  author: string;
  permlink: string;
  title: string;
  body: string;
  tags: string[];
  featuredImage?: string;
  sportCategory?: string;
  created: string;
  net_votes: number;
  children: number;
  pending_payout_value?: string;
  active_votes?: Array<{
    voter: string;
    weight: number;
    percent: number;
    rshares?: string;
    reputation?: string;
    time?: string;
  }>;
  authorDisplayName?: string;
  authorAvatar?: string;
  source: 'hive' | 'soft';
  _isSoftPost?: boolean;
  _softPostId?: string;
  _likeCount?: number;
  _viewCount?: number;
}

/**
 * Union type for all post variants
 */
export type AnyPost = Post | SportsblockPost | DisplayPost;

/**
 * Extended SportsblockPost with soft post metadata
 * These fields are added by the unified feed converter
 */
export interface SoftPostExtension {
  _isSoftPost?: boolean;
  _softPostId?: string;
  _likeCount?: number;
}

export type ExtendedSportsblockPost = SportsblockPost & SoftPostExtension;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a post is a DisplayPost (lightweight feed post)
 */
export function isDisplayPost(post: AnyPost): post is DisplayPost {
  return 'postType' in post && (post as DisplayPost).postType === 'display';
}

/**
 * Check if a post is a SportsblockPost (full Hive blockchain post)
 */
export function isSportsblockPost(post: AnyPost): post is SportsblockPost {
  if (isDisplayPost(post)) return false;
  return (
    'isSportsblockPost' in post ||
    ('author' in post && 'permlink' in post && typeof post.author === 'string')
  );
}

/**
 * Check if a post is a soft post (converted from database)
 */
export function isSoftPost(post: AnyPost): post is ExtendedSportsblockPost | DisplayPost {
  if (isDisplayPost(post)) return post._isSoftPost === true;
  return isSportsblockPost(post) && (post as SoftPostExtension)._isSoftPost === true;
}

/**
 * Check if a post is an actual Hive blockchain post (not soft)
 */
export function isHivePost(post: AnyPost): post is SportsblockPost {
  return isSportsblockPost(post) && !isSoftPost(post);
}

/**
 * Check if a post is a legacy Post type
 */
export function isLegacyPost(post: AnyPost): post is Post {
  return !isDisplayPost(post) && 'id' in post && !isSportsblockPost(post);
}

// ============================================================================
// Property Accessors
// ============================================================================

/**
 * Get the post author username
 */
export function getPostAuthor(post: AnyPost): string {
  if (isSportsblockPost(post)) {
    return post.author;
  }
  return typeof post.author === 'string' ? post.author : post.author.username;
}

/**
 * Get the post permlink (for Hive/display posts) or ID (for legacy posts)
 */
export function getPostPermlink(post: AnyPost): string {
  if (isSportsblockPost(post)) return post.permlink;
  if (isDisplayPost(post)) return post.permlink;
  return post.id;
}

/**
 * Get a unique identifier for the post
 */
export function getPostId(post: AnyPost): string {
  if (isSportsblockPost(post)) return `${post.author}/${post.permlink}`;
  if (isDisplayPost(post)) return `${post.author}/${post.permlink}`;
  return post.id;
}

/**
 * Get the soft post ID if available
 */
export function getSoftPostId(post: AnyPost): string | undefined {
  if (isDisplayPost(post)) return post._softPostId;
  if (isSoftPost(post)) return post._softPostId;
  return undefined;
}

/**
 * Get the post title
 */
export function getPostTitle(post: AnyPost): string {
  return post.title;
}

/**
 * Get the post body content
 */
export function getPostBody(post: AnyPost): string {
  if (isSportsblockPost(post)) return post.body;
  if (isDisplayPost(post)) return post.body;
  return post.content;
}

/**
 * Get the post creation date
 */
export function getPostCreatedAt(post: AnyPost): Date {
  if (isSportsblockPost(post)) return new Date(post.created);
  if (isDisplayPost(post)) return new Date(post.created);
  return post.publishedAt || post.createdAt;
}

/**
 * Get the post vote/like count.
 * For Hive posts, uses active_votes.length (total voters) rather than
 * net_votes (upvotes minus downvotes) which can be 0 even with many voters.
 */
export function getPostVoteCount(post: AnyPost): number {
  if (isDisplayPost(post)) return post._isSoftPost ? post._likeCount || 0 : post.net_votes || 0;
  if (isSoftPost(post)) return post._likeCount || 0;
  if (isSportsblockPost(post)) return post.active_votes?.length || post.net_votes || 0;
  return (post as Post).upvotes || 0;
}

/**
 * Get the post comment count
 */
export function getPostCommentCount(post: AnyPost): number {
  if (isSportsblockPost(post)) return post.children || 0;
  if (isDisplayPost(post)) return post.children || 0;
  return (post as Post).comments || 0;
}

/**
 * Get the sport category for the post
 */
export function getPostSportCategory(post: AnyPost): string | undefined {
  if (isSportsblockPost(post)) return post.sportCategory || post.sport_category;
  if (isDisplayPost(post)) return post.sportCategory;
  return post.sport?.name;
}

/**
 * Get the post tags
 */
export function getPostTags(post: AnyPost): string[] {
  return post.tags || [];
}

/**
 * Get the post URL path
 */
export function getPostUrl(post: AnyPost): string {
  if (isSportsblockPost(post)) return `/post/${post.author}/${post.permlink}`;
  if (isDisplayPost(post)) return `/post/${post.author}/${post.permlink}`;
  return `/post/${post.id}`;
}

/**
 * Get word count from text content
 */
export function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Get estimated read time in minutes (based on 200 words per minute)
 */
export function getPostReadTime(post: AnyPost): number {
  const text = isSportsblockPost(post)
    ? post.body
    : isDisplayPost(post)
      ? post.body
      : (post as Post).content;
  if (!text) return 1;
  const wordCount = getWordCount(text);
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Get the featured image URL if available
 */
export function getPostFeaturedImage(post: AnyPost): string | undefined {
  if (isDisplayPost(post)) return post.featuredImage;
  if (!isSportsblockPost(post) && post.featuredImage) return post.featuredImage;
  return undefined;
}

// ============================================================================
// Author Helpers
// ============================================================================

/**
 * Get author avatar URL
 */
export function getAuthorAvatar(post: AnyPost): string | undefined {
  if (isDisplayPost(post)) return post.authorAvatar;
  if (!isSportsblockPost(post) && typeof post.author !== 'string') {
    return post.author.avatar;
  }
  return undefined;
}

/**
 * Get author display name
 */
export function getAuthorDisplayName(post: AnyPost): string {
  if (isDisplayPost(post)) return post.authorDisplayName || post.author;
  if (!isSportsblockPost(post) && typeof post.author !== 'string') {
    return post.author.displayName || post.author.username;
  }
  return getPostAuthor(post);
}
