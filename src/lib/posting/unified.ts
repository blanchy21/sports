import { User } from '@/types';
import { FirebasePosts } from '@/lib/firebase/posts';
import { SoftPost } from '@/types/auth';

export interface PostData {
  title: string;
  content: string;
  tags: string[];
  parentAuthor?: string;
  parentPermlink?: string;
}

export interface PostResult {
  success: boolean;
  postId?: string;
  permlink?: string;
  error?: string;
  isHivePost?: boolean;
}

export class UnifiedPostingService {
  static async createPost(
    user: User,
    postData: PostData
  ): Promise<PostResult> {
    try {
      if (user.isHiveAuth) {
        // For Hive users, we would use the existing Hive posting logic
        // This is a placeholder - you would integrate with your existing Hive posting
        return {
          success: false,
          error: 'Hive posting not yet implemented in unified service',
          isHivePost: true
        };
      } else {
        // For soft users, create a post in Firebase
        const post = await FirebasePosts.createPost(
          user.id,
          postData.title,
          postData.content,
          postData.tags
        );

        return {
          success: true,
          postId: post.id,
          permlink: post.permlink,
          isHivePost: false
        };
      }
    } catch (error) {
      console.error('Error creating post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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

  static async getAllPosts(limit: number = 20, offset: number = 0): Promise<SoftPost[]> {
    // For now, only return soft posts
    // In a full implementation, you would merge Hive and soft posts
    return await FirebasePosts.getAllPosts(limit, offset);
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
        error: error instanceof Error ? error.message : 'Unknown error'
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
        error: error instanceof Error ? error.message : 'Unknown error'
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
          error: 'User must be upgraded to Hive account to migrate posts'
        };
      }

      // Get the soft post
      const softPost = await FirebasePosts.getPostById(postId);
      if (!softPost) {
        return {
          success: false,
          error: 'Post not found'
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
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
