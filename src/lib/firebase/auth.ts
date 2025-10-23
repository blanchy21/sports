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
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase signout error:', error);
      throw error;
    }
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
        unsubscribe();
        
        if (!user) {
          resolve(null);
          return;
        }

        try {
          // Get user profile from Firestore
          const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
          
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
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }

      try {
        // Get user profile from Firestore
        const profileDoc = await getDoc(doc(db, 'profiles', firebaseUser.uid));
        
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
