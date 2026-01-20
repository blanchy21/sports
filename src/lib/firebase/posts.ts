import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  serverTimestamp,
  DocumentSnapshot,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { SoftPost } from '@/types/auth';

// Scheduled post status
export type ScheduledPostStatus = 'pending' | 'published' | 'failed' | 'cancelled';

// Scheduled post interface
export interface ScheduledPost {
  id: string;
  userId: string;
  postData: CreateSoftPostInput;
  scheduledAt: Date;
  status: ScheduledPostStatus;
  createdAt: Date;
  publishedAt?: Date;
  publishedPostId?: string;
  error?: string;
}

const FIREBASE_NOT_CONFIGURED_ERROR = new Error(
  'Firebase is not configured. Post storage is unavailable. ' +
  'Set NEXT_PUBLIC_FIREBASE_* environment variables to enable.'
);

export interface CreateSoftPostInput {
  authorId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  title: string;
  content: string;
  tags?: string[];
  sportCategory?: string;
  featuredImage?: string;
  communityId?: string;
  communitySlug?: string;
  communityName?: string;
}

export class FirebasePosts {
  static async createPost(input: CreateSoftPostInput): Promise<SoftPost> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      // Generate a unique permlink
      const permlink = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}-${Date.now()}`;

      // Generate excerpt from content (first 200 chars, strip markdown)
      const excerpt = input.content
        .replace(/[#*_`~\[\]()>]/g, '')
        .substring(0, 200)
        .trim() + (input.content.length > 200 ? '...' : '');

      const postData = {
        authorId: input.authorId,
        authorUsername: input.authorUsername,
        authorDisplayName: input.authorDisplayName || input.authorUsername,
        authorAvatar: input.authorAvatar || null,
        title: input.title,
        content: input.content,
        excerpt,
        permlink,
        tags: input.tags || [],
        sportCategory: input.sportCategory || null,
        featuredImage: input.featuredImage || null,
        communityId: input.communityId || null,
        communitySlug: input.communitySlug || null,
        communityName: input.communityName || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublishedToHive: false,
        hivePermlink: null,
        viewCount: 0,
        likeCount: 0
      };

      const docRef = await addDoc(collection(db, 'soft_posts'), postData);

      return {
        id: docRef.id,
        authorId: input.authorId,
        authorUsername: input.authorUsername,
        authorDisplayName: input.authorDisplayName || input.authorUsername,
        authorAvatar: input.authorAvatar,
        title: input.title,
        content: input.content,
        excerpt,
        permlink,
        tags: input.tags || [],
        sportCategory: input.sportCategory,
        featuredImage: input.featuredImage,
        communityId: input.communityId,
        communitySlug: input.communitySlug,
        communityName: input.communityName,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublishedToHive: false,
        hivePermlink: undefined,
        viewCount: 0,
        likeCount: 0
      };
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  static async getPostsByAuthor(authorId: string): Promise<SoftPost[]> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const q = query(
        collection(db, 'soft_posts'),
        where('authorId', '==', authorId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => this.docToSoftPost(docSnap));
    } catch (error) {
      console.error('Error getting posts by author:', error);
      throw error;
    }
  }

  static async getAllPosts(postsLimit: number = 20, lastDoc?: DocumentSnapshot): Promise<SoftPost[]> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      let q = query(
        collection(db, 'soft_posts'),
        orderBy('createdAt', 'desc'),
        limit(postsLimit)
      );

      if (lastDoc) {
        q = query(
          collection(db, 'soft_posts'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(postsLimit)
        );
      }

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => this.docToSoftPost(docSnap));
    } catch (error) {
      console.error('Error getting all posts:', error);
      throw error;
    }
  }

  static async getPostById(id: string): Promise<SoftPost | null> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'soft_posts', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return this.docToSoftPost(docSnap);
    } catch (error) {
      console.error('Error getting post by ID:', error);
      return null;
    }
  }

  static async getPostByPermlink(permlink: string): Promise<SoftPost | null> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const q = query(
        collection(db, 'soft_posts'),
        where('permlink', '==', permlink),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      return this.docToSoftPost(querySnapshot.docs[0]);
    } catch (error) {
      console.error('Error getting post by permlink:', error);
      return null;
    }
  }

  static async getPostsByCommunity(communityId: string, postsLimit: number = 20): Promise<SoftPost[]> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const q = query(
        collection(db, 'soft_posts'),
        where('communityId', '==', communityId),
        orderBy('createdAt', 'desc'),
        limit(postsLimit)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => this.docToSoftPost(docSnap));
    } catch (error) {
      console.error('Error getting posts by community:', error);
      throw error;
    }
  }

  // Helper to convert Firestore document to SoftPost
  private static docToSoftPost(docSnap: DocumentSnapshot): SoftPost {
    const data = docSnap.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }

    return {
      id: docSnap.id,
      authorId: data.authorId,
      authorUsername: data.authorUsername || 'unknown',
      authorDisplayName: data.authorDisplayName,
      authorAvatar: data.authorAvatar,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      permlink: data.permlink,
      tags: data.tags || [],
      sportCategory: data.sportCategory,
      featuredImage: data.featuredImage,
      communityId: data.communityId,
      communitySlug: data.communitySlug,
      communityName: data.communityName,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      isPublishedToHive: data.isPublishedToHive || false,
      hivePermlink: data.hivePermlink || undefined,
      viewCount: data.viewCount || 0,
      likeCount: data.likeCount || 0
    };
  }

  static async updatePost(
    id: string,
    updates: Partial<{
      title: string;
      content: string;
      tags: string[];
    }>
  ): Promise<SoftPost> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'soft_posts', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Return updated post
      const updatedPost = await this.getPostById(id);
      if (!updatedPost) {
        throw new Error('Post not found after update');
      }
      
      return updatedPost;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  static async markAsPublishedToHive(id: string, hivePermlink: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'soft_posts', id);
      await updateDoc(docRef, {
        isPublishedToHive: true,
        hivePermlink,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking post as published to Hive:', error);
      throw error;
    }
  }

  static async deletePost(id: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'soft_posts', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  // Engagement tracking (no rewards for soft posts)
  static async incrementViewCount(id: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'soft_posts', id);
      await updateDoc(docRef, {
        viewCount: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Don't throw - view count is not critical
    }
  }

  static async incrementLikeCount(id: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'soft_posts', id);
      await updateDoc(docRef, {
        likeCount: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing like count:', error);
      throw error;
    }
  }

  static async decrementLikeCount(id: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'soft_posts', id);
      await updateDoc(docRef, {
        likeCount: increment(-1)
      });
    } catch (error) {
      console.error('Error decrementing like count:', error);
      throw error;
    }
  }

  // ==================== SCHEDULED POSTS ====================

  /**
   * Create a scheduled post
   */
  static async createScheduledPost(
    userId: string,
    postData: CreateSoftPostInput,
    scheduledAt: Date
  ): Promise<ScheduledPost> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const scheduledPostData = {
        userId,
        postData,
        scheduledAt: Timestamp.fromDate(scheduledAt),
        status: 'pending' as ScheduledPostStatus,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'scheduled_posts'), scheduledPostData);

      return {
        id: docRef.id,
        userId,
        postData,
        scheduledAt,
        status: 'pending',
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating scheduled post:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled posts for a user
   */
  static async getScheduledPosts(userId: string): Promise<ScheduledPost[]> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const q = query(
        collection(db, 'scheduled_posts'),
        where('userId', '==', userId),
        orderBy('scheduledAt', 'asc')
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          postData: data.postData,
          scheduledAt: data.scheduledAt?.toDate() || new Date(),
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
          publishedPostId: data.publishedPostId,
          error: data.error,
        };
      });
    } catch (error) {
      console.error('Error getting scheduled posts:', error);
      throw error;
    }
  }

  /**
   * Get pending scheduled posts that are due for publishing
   */
  static async getPendingScheduledPosts(): Promise<ScheduledPost[]> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const now = Timestamp.fromDate(new Date());
      const q = query(
        collection(db, 'scheduled_posts'),
        where('status', '==', 'pending'),
        where('scheduledAt', '<=', now),
        orderBy('scheduledAt', 'asc'),
        limit(10)
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          postData: data.postData,
          scheduledAt: data.scheduledAt?.toDate() || new Date(),
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });
    } catch (error) {
      console.error('Error getting pending scheduled posts:', error);
      throw error;
    }
  }

  /**
   * Mark a scheduled post as published
   */
  static async markScheduledPostPublished(
    scheduledPostId: string,
    publishedPostId: string
  ): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'scheduled_posts', scheduledPostId);
      await updateDoc(docRef, {
        status: 'published',
        publishedAt: serverTimestamp(),
        publishedPostId,
      });
    } catch (error) {
      console.error('Error marking scheduled post as published:', error);
      throw error;
    }
  }

  /**
   * Mark a scheduled post as failed
   */
  static async markScheduledPostFailed(
    scheduledPostId: string,
    errorMessage: string
  ): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'scheduled_posts', scheduledPostId);
      await updateDoc(docRef, {
        status: 'failed',
        error: errorMessage,
      });
    } catch (error) {
      console.error('Error marking scheduled post as failed:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled post
   */
  static async cancelScheduledPost(scheduledPostId: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'scheduled_posts', scheduledPostId);
      await updateDoc(docRef, {
        status: 'cancelled',
      });
    } catch (error) {
      console.error('Error cancelling scheduled post:', error);
      throw error;
    }
  }

  /**
   * Delete a scheduled post
   */
  static async deleteScheduledPost(scheduledPostId: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'scheduled_posts', scheduledPostId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting scheduled post:', error);
      throw error;
    }
  }

  /**
   * Update a scheduled post's date
   */
  static async updateScheduledPostDate(
    scheduledPostId: string,
    newScheduledAt: Date
  ): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'scheduled_posts', scheduledPostId);
      await updateDoc(docRef, {
        scheduledAt: Timestamp.fromDate(newScheduledAt),
      });
    } catch (error) {
      console.error('Error updating scheduled post date:', error);
      throw error;
    }
  }
}
