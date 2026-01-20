import { User } from '@/types';
import { FirebasePosts, CreateSoftPostInput } from '@/lib/firebase/posts';
import { SoftPost } from '@/types/auth';

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
   * Soft users: Posts go to Firebase, visible on platform but no rewards
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
        // For soft users, create a post in Firebase
        const input: CreateSoftPostInput = {
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
        };

        const post = await FirebasePosts.createPost(input);

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
        isHivePost: user.isHiveAuth
      };
    }
  }

  static async getUserPosts(user: User): Promise<SoftPost[]> {
    if (user.isHiveAuth) {
      // For Hive users, we would fetch from Hive blockchain
      // This is a placeholder - you would integrate with your existing Hive fetching
      return [];
    } else {
      // For soft users, fetch from Firebase
      return await FirebasePosts.getPostsByAuthor(user.id);
    }
  }

  static async getAllPosts(limit: number = 20): Promise<SoftPost[]> {
    // For now, only return soft posts
    // In a full implementation, you would merge Hive and soft posts
    return await FirebasePosts.getAllPosts(limit);
  }

  static async getPostById(postId: string, user: User): Promise<SoftPost | null> {
    if (user.isHiveAuth) {
      // For Hive users, we would fetch from Hive blockchain
      // This is a placeholder
      return null;
    } else {
      // For soft users, fetch from Firebase
      return await FirebasePosts.getPostById(postId);
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
        // For soft users, update in Firebase
        const post = await FirebasePosts.updatePost(postId, updates);
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
        isHivePost: user.isHiveAuth
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
        // For soft users, delete from Firebase
        await FirebasePosts.deletePost(postId);
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
        isHivePost: user.isHiveAuth
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
      const softPost = await FirebasePosts.getPostById(postId);
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

      // Mark as published to Hive
      await FirebasePosts.markAsPublishedToHive(postId, hivePermlink);

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
