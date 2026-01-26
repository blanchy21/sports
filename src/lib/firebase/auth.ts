import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  limit,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './config';

const FIREBASE_NOT_CONFIGURED_ERROR = new Error(
  'Firebase is not configured. Email authentication is unavailable. ' +
  'Set NEXT_PUBLIC_FIREBASE_* environment variables to enable.'
);

export interface AuthUser {
  id: string;
  email?: string;
  username: string;
  displayName: string;
  avatar?: string;
  isHiveUser: boolean;
  hiveUsername?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  isHiveUser: boolean;
  hiveUsername?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}

export class FirebaseAuth {
  static async signUp(
    email: string,
    password: string,
    username: string,
    displayName?: string
  ): Promise<AuthUser> {
    if (!auth || !db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update the user's display name
      await updateProfile(user, {
        displayName: displayName || username
      });

      // Create user profile in Firestore
      const profile: Profile = {
        id: user.uid,
        username,
        displayName: displayName || username,
        isHiveUser: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'profiles', user.uid), {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      });

      return {
        id: user.uid,
        email: user.email || undefined,
        username,
        displayName: displayName || username,
        isHiveUser: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Firebase signup error:', error);
      throw error;
    }
  }

  static async signIn(email: string, password: string): Promise<AuthUser> {
    if (!auth || !db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user profile from Firestore
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));

      if (!profileDoc.exists()) {
        throw new Error('User profile not found');
      }

      const profileData = profileDoc.data();

      // Update lastActiveAt on sign in
      await updateDoc(doc(db, 'profiles', user.uid), {
        lastActiveAt: serverTimestamp()
      });

      return {
        id: user.uid,
        email: user.email || undefined,
        username: profileData.username,
        displayName: profileData.displayName,
        avatar: profileData.avatarUrl,
        isHiveUser: profileData.isHiveUser,
        hiveUsername: profileData.hiveUsername,
        createdAt: profileData.createdAt?.toDate() || new Date(),
        updatedAt: profileData.updatedAt?.toDate() || new Date()
      };
    } catch (error) {
      console.error('Firebase signin error:', error);
      throw error;
    }
  }

  static async signInWithGoogle(): Promise<AuthUser> {
    if (!auth || !db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if profile already exists
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));

      if (profileDoc.exists()) {
        // Existing user - update lastActiveAt and return
        const profileData = profileDoc.data();
        await updateDoc(doc(db, 'profiles', user.uid), {
          lastActiveAt: serverTimestamp()
        });

        return {
          id: user.uid,
          email: user.email || undefined,
          username: profileData.username,
          displayName: profileData.displayName,
          avatar: profileData.avatarUrl || user.photoURL || undefined,
          isHiveUser: profileData.isHiveUser,
          hiveUsername: profileData.hiveUsername,
          createdAt: profileData.createdAt?.toDate() || new Date(),
          updatedAt: profileData.updatedAt?.toDate() || new Date()
        };
      }

      // New user - create profile
      // Generate username from email (before @) or use uid
      const emailPrefix = user.email?.split('@')[0] || '';
      const baseUsername = emailPrefix.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || `user_${user.uid.slice(0, 8)}`;

      // Check if username is taken and append numbers if needed
      let username = baseUsername;
      let attempts = 0;
      while (attempts < 10) {
        const existingUser = await this.getProfileByUsername(username);
        if (!existingUser) break;
        attempts++;
        username = `${baseUsername}${attempts}`;
      }

      const displayName = user.displayName || username;

      const profile: Profile = {
        id: user.uid,
        username,
        displayName,
        avatarUrl: user.photoURL || undefined,
        isHiveUser: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'profiles', user.uid), {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      });

      return {
        id: user.uid,
        email: user.email || undefined,
        username,
        displayName,
        avatar: user.photoURL || undefined,
        isHiveUser: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Firebase Google signin error:', error);
      throw error;
    }
  }

  static async signOut(): Promise<void> {
    if (!auth) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase signout error:', error);
      throw error;
    }
  }

  /**
   * Send a password reset email to the user
   */
  static async sendPasswordReset(email: string): Promise<void> {
    if (!auth) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Firebase password reset error:', error);
      throw error;
    }
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    if (!auth || !db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    // Capture in local variables for TypeScript narrowing in callbacks
    const firebaseAuth = auth;
    const firebaseDb = db;

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user: FirebaseUser | null) => {
        unsubscribe();

        if (!user) {
          resolve(null);
          return;
        }

        try {
          // Get user profile from Firestore
          const profileDoc = await getDoc(doc(firebaseDb, 'profiles', user.uid));
          
          if (!profileDoc.exists()) {
            resolve(null);
            return;
          }

          const profileData = profileDoc.data();
          
          resolve({
            id: user.uid,
            email: user.email || undefined,
            username: profileData.username,
            displayName: profileData.displayName,
            avatar: profileData.avatarUrl,
            isHiveUser: profileData.isHiveUser,
            hiveUsername: profileData.hiveUsername,
            createdAt: profileData.createdAt?.toDate() || new Date(),
            updatedAt: profileData.updatedAt?.toDate() || new Date()
          });
        } catch (error) {
          console.error('Error getting current user:', error);
          resolve(null);
        }
      });
    });
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      await updateDoc(doc(db, 'profiles', userId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  static async upgradeToHive(userId: string, hiveUsername: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      await updateDoc(doc(db, 'profiles', userId), {
        isHiveUser: true,
        hiveUsername,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error upgrading to Hive:', error);
      throw error;
    }
  }

  /**
   * Get a user profile by username
   */
  static async getProfileByUsername(username: string): Promise<Profile | null> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const q = query(
        collection(db, 'profiles'),
        where('username', '==', username),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();

      return {
        id: docSnap.id,
        username: data.username,
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        isHiveUser: data.isHiveUser || false,
        hiveUsername: data.hiveUsername,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastActiveAt: data.lastActiveAt?.toDate(),
      };
    } catch (error) {
      console.error('Error getting profile by username:', error);
      return null;
    }
  }

  /**
   * Get a user profile by ID
   */
  static async getProfileById(userId: string): Promise<Profile | null> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();

      return {
        id: docSnap.id,
        username: data.username,
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        isHiveUser: data.isHiveUser || false,
        hiveUsername: data.hiveUsername,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastActiveAt: data.lastActiveAt?.toDate(),
      };
    } catch (error) {
      console.error('Error getting profile by ID:', error);
      return null;
    }
  }

  /**
   * Update the lastActiveAt timestamp for a user
   * Call this when the user performs significant actions
   */
  static async updateLastActiveAt(userId: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      await updateDoc(doc(db, 'profiles', userId), {
        lastActiveAt: serverTimestamp()
      });
    } catch (error) {
      // Log but don't throw - this is a non-critical update
      console.error('Error updating lastActiveAt:', error);
    }
  }

  /**
   * Search profiles by username or display name
   */
  static async searchProfiles(searchQuery: string, maxResults: number = 10): Promise<Profile[]> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      // Firestore doesn't support full-text search, so we do prefix matching
      const searchLower = searchQuery.toLowerCase();
      const endString = searchLower + '\uf8ff';

      // Search by username (case-sensitive due to Firestore limitations)
      const usernameQuery = query(
        collection(db, 'profiles'),
        where('username', '>=', searchLower),
        where('username', '<=', endString),
        limit(maxResults)
      );

      const querySnapshot = await getDocs(usernameQuery);
      const profiles: Profile[] = [];

      querySnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        profiles.push({
          id: docSnap.id,
          username: data.username,
          displayName: data.displayName,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
          isHiveUser: data.isHiveUser || false,
          hiveUsername: data.hiveUsername,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastActiveAt: data.lastActiveAt?.toDate(),
        });
      });

      return profiles;
    } catch (error) {
      console.error('Error searching profiles:', error);
      return [];
    }
  }

  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    if (!auth || !db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    // Capture in local variables for TypeScript narrowing in callbacks
    const firebaseAuth = auth;
    const firebaseDb = db;

    return onAuthStateChanged(firebaseAuth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }

      try {
        // Get user profile from Firestore
        const profileDoc = await getDoc(doc(firebaseDb, 'profiles', firebaseUser.uid));
        
        if (!profileDoc.exists()) {
          callback(null);
          return;
        }

        const profileData = profileDoc.data();
        
        const authUser: AuthUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          username: profileData.username,
          displayName: profileData.displayName,
          avatar: profileData.avatarUrl,
          isHiveUser: profileData.isHiveUser,
          hiveUsername: profileData.hiveUsername,
          createdAt: profileData.createdAt?.toDate() || new Date(),
          updatedAt: profileData.updatedAt?.toDate() || new Date()
        };

        callback(authUser);
      } catch (error) {
        console.error('Error in auth state change:', error);
        callback(null);
      }
    });
  }
}
