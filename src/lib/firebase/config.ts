import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { publicEnv, isFirebaseConfigured } from '@/lib/env';

const firebaseConfig = {
  apiKey: publicEnv.firebase.apiKey,
  authDomain: publicEnv.firebase.authDomain,
  projectId: publicEnv.firebase.projectId,
  storageBucket: publicEnv.firebase.storageBucket,
  messagingSenderId: publicEnv.firebase.messagingSenderId,
  appId: publicEnv.firebase.appId,
};

// Initialize Firebase only if configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else if (typeof window !== 'undefined') {
  console.warn(
    'Firebase is not configured. Email authentication will be unavailable. ' +
    'Set NEXT_PUBLIC_FIREBASE_* environment variables to enable.'
  );
}

export { auth, db };
export default app;
