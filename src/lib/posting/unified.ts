/**
 * Unified Posting Service
 *
 * Routes posts to either Hive blockchain or Firebase based on user auth type.
 * Uses authenticated API calls with proper authorization headers.
 */

import { User } from '@/types';
import { SoftPost } from '@/types/auth';
import { authenticatedPost, authenticatedPatch, authenticatedDelete, authenticatedFetch } from '@/lib/api/authenticated-fetch';

export interface PostData {
  title: string;
  content: string;
  tags: string[];
  sportCategory?: string;
  featuredImage?: string;
  communityId?: string;
  communitySlug?: string;
  communityName?: string;
}

export interface PostResult {
  success: boolean;
  postId?: string;
  permlink?: string;
  url?: string;
  error?: string;
  isHivePost: boolean;
}

export class UnifiedPostingService {
  /**
   * Create a post - routes to Hive blockchain or Firebase based on user auth type
   *
   * Hive users: Posts go to blockchain, earn HIVE rewards and MEDALS
   * Soft users: Posts go to Firebase via authenticated API, visible on platform but no rewards
   */
  static async createPost(
    user: User,
    postData: PostData
  ): Promise<PostResult> {
    try {
      if (user.isHiveAuth && user.hiveUsername) {
        // For Hive users, we delegate to the existing Hive posting system
        // The publish page handles this directly with publishPost()
        // This branch is here for completeness but Hive posting goes through
        // the existing flow in src/lib/hive-workerbee/posting.ts
        return {
          success: false,
          error: 'Use publishPost() directly for Hive posts',
          isHivePost: true
        };
      } else {
        // For soft users, create a post via the authenticated API
        const response = await authenticatedPost('/api/posts', {
          authorId: user.id,
          authorUsername: user.username,
          authorDisplayName: user.displayName,
          authorAvatar: user.avatar,
          title: postData.title,
          content: postData.content,
          tags: postData.tags,
          sportCategory: postData.sportCategory,
          featuredImage: postData.featuredImage,
          communityId: postData.communityId,
          communitySlug: postData.communitySlug,
          communityName: postData.communityName
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          return {
            success: false,
            error: result.error || 'Failed to create post',
            isHivePost: false
          };
        }

        const post = result.post;
        return {
          success: true,
          postId: post.id,
          permlink: post.permlink,
          url: `/post/soft/${post.permlink}`,
          isHivePost: false
        };
      }
    } catch (error) {
      console.error('Error creating post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isHivePost: user.isHiveAuth ?? false
      };
    }
  }

  static async getUserPosts(user: User): Promise<SoftPost[]> {
    if (user.isHiveAuth) {
      // For Hive users, we would fetch from Hive blockchain
      // This is a placeholder - you would integrate with your existing Hive fetching
      return [];
    } else {
      // For soft users, fetch from API
      try {
        const response = await authenticatedFetch(`/api/posts?authorId=${encodeURIComponent(user.id)}`);
        const result = await response.json();
        return result.success ? result.posts : [];
      } catch {
        return [];
      }
    }
  }

  static async getAllPosts(limit: number = 20): Promise<SoftPost[]> {
    try {
      const response = await fetch(`/api/posts?limit=${limit}`);
      const result = await response.json();
      return result.success ? result.posts : [];
    } catch {
      return [];
    }
  }

  static async getPostById(postId: string): Promise<SoftPost | null> {
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`);
      const result = await response.json();
      return result.success ? result.post : null;
    } catch {
      return null;
    }
  }

  static async updatePost(
    postId: string,
    updates: Partial<{
      title: string;
      content: string;
      tags: string[];
    }>,
    user: User
  ): Promise<PostResult> {
    try {
      if (user.isHiveAuth) {
        // For Hive users, we would update on Hive blockchain
        // This is a placeholder
        return {
          success: false,
          error: 'Hive post updates not yet implemented in unified service',
          isHivePost: true
        };
      } else {
        // For soft users, update via authenticated API
        const response = await authenticatedPatch(`/api/posts/${encodeURIComponent(postId)}`, {
          ...updates,
          userId: user.id
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          return {
            success: false,
            error: result.error || 'Failed to update post',
            isHivePost: false
          };
        }

        const post = result.post;
        return {
          success: true,
          postId: post.id,
          permlink: post.permlink,
          isHivePost: false
        };
      }
    } catch (error) {
      console.error('Error updating post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isHivePost: user.isHiveAuth ?? false
      };
    }
  }

  static async deletePost(postId: string, user: User): Promise<PostResult> {
    try {
      if (user.isHiveAuth) {
        // For Hive users, we would delete from Hive blockchain
        // This is a placeholder
        return {
          success: false,
          error: 'Hive post deletion not yet implemented in unified service',
          isHivePost: true
        };
      } else {
        // For soft users, delete via authenticated API
        const response = await authenticatedDelete(`/api/posts/${encodeURIComponent(postId)}`, {
          userId: user.id
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          return {
            success: false,
            error: result.error || 'Failed to delete post',
            isHivePost: false
          };
        }

        return {
          success: true,
          isHivePost: false
        };
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isHivePost: user.isHiveAuth ?? false
      };
    }
  }

  static async migrateSoftPostToHive(
    postId: string,
    user: User
  ): Promise<PostResult> {
    try {
      if (!user.isHiveAuth) {
        return {
          success: false,
          error: 'User must be upgraded to Hive account to migrate posts',
          isHivePost: false
        };
      }

      // Get the soft post
      const softPost = await this.getPostById(postId);
      if (!softPost) {
        return {
          success: false,
          error: 'Post not found',
          isHivePost: true
        };
      }

      // Here you would publish to Hive blockchain
      // This is a placeholder - you would integrate with your existing Hive posting
      const hivePermlink = `migrated-${softPost.permlink}`;

      // Mark as published to Hive via authenticated API
      const response = await authenticatedPatch(`/api/posts/${encodeURIComponent(postId)}`, {
        isPublishedToHive: true,
        hivePermlink: hivePermlink,
        userId: user.id
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.error || 'Failed to mark post as migrated',
          isHivePost: true
        };
      }

      return {
        success: true,
        postId: postId,
        permlink: hivePermlink,
        isHivePost: true
      };
    } catch (error) {
      console.error('Error migrating post to Hive:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isHivePost: true
      };
    }
  }
}
