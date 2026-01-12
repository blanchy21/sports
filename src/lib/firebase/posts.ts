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
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './config';
import { SoftPost } from '@/types/auth';

const FIREBASE_NOT_CONFIGURED_ERROR = new Error(
  'Firebase is not configured. Post storage is unavailable. ' +
  'Set NEXT_PUBLIC_FIREBASE_* environment variables to enable.'
);

export class FirebasePosts {
  static async createPost(
    authorId: string,
    title: string,
    content: string,
    tags: string[] = []
  ): Promise<SoftPost> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      // Generate a unique permlink
      const permlink = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

      const docRef = await addDoc(collection(db, 'soft_posts'), {
        authorId,
        title,
        content,
        permlink,
        tags,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublishedToHive: false,
        hivePermlink: null
      });

      return {
        id: docRef.id,
        authorId,
        title,
        content,
        permlink,
        tags,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublishedToHive: false,
        hivePermlink: undefined
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
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          authorId: data.authorId,
          title: data.title,
          content: data.content,
          permlink: data.permlink,
          tags: data.tags || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isPublishedToHive: data.isPublishedToHive || false,
          hivePermlink: data.hivePermlink || undefined
        };
      });
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
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          authorId: data.authorId,
          title: data.title,
          content: data.content,
          permlink: data.permlink,
          tags: data.tags || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isPublishedToHive: data.isPublishedToHive || false,
          hivePermlink: data.hivePermlink || undefined
        };
      });
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

      const data = docSnap.data();
      return {
        id: docSnap.id,
        authorId: data.authorId,
        title: data.title,
        content: data.content,
        permlink: data.permlink,
        tags: data.tags || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        isPublishedToHive: data.isPublishedToHive || false,
        hivePermlink: data.hivePermlink || undefined
      };
    } catch (error) {
      console.error('Error getting post by ID:', error);
      return null;
    }
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
}
