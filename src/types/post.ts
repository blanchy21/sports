/**
 * Post and Comment type definitions
 */

import type { User } from './user';
import type { SportCategory } from './sports';

export interface Post {
  /** Discriminant for Post union types */
  postType: 'standard';
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: User;
  featuredImage?: string;
  sport: SportCategory;
  tags: string[];
  isPublished: boolean;
  isDraft: boolean;
  hivePostId?: string;
  hiveUrl?: string;
  author_permlink?: string; // For Hive posts
  permlink?: string; // For Hive posts
  pendingPayout?: number; // Hive pending payout
  netVotes?: number; // Hive net votes
  upvotes: number;
  comments: number;
  readTime: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  postId: string;
  parentId?: string;
  replies: Comment[];
  upvotes: number;
  createdAt: Date;
  updatedAt: Date;
}
