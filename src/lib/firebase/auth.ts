import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
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
        updatedAt: serverTimestamp()
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
