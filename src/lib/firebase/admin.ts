import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

/**
 * Initialize Firebase Admin SDK
 *
 * Supports two authentication methods:
 * 1. Service Account JSON (recommended for production)
 *    - Set FIREBASE_SERVICE_ACCOUNT_KEY env var with the JSON string
 * 2. Project ID only (for environments with Application Default Credentials)
 *    - Set FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID
 */
function initializeAdmin(): { app: App; db: Firestore } | null {
  // Return existing instances if already initialized
  if (adminApp && adminDb) {
    return { app: adminApp, db: adminDb };
  }

  // Check if already initialized by another module
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    adminDb = getFirestore(adminApp);
    return { app: adminApp, db: adminDb };
  }

  try {
    // Method 1: Service Account JSON
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id,
        });
        adminDb = getFirestore(adminApp);
        console.log('[Firebase Admin] Initialized with service account');
        return { app: adminApp, db: adminDb };
      } catch (parseError) {
        console.error('[Firebase Admin] Failed to parse service account key:', parseError);
      }
    }

    // Method 2: Project ID with Application Default Credentials
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId) {
      adminApp = initializeApp({
        projectId,
      });
      adminDb = getFirestore(adminApp);
      console.log('[Firebase Admin] Initialized with project ID:', projectId);
      return { app: adminApp, db: adminDb };
    }

    console.warn(
      '[Firebase Admin] Not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID env var.'
    );
    return null;
  } catch (error) {
    console.error('[Firebase Admin] Initialization error:', error);
    return null;
  }
}

/**
 * Get the Firebase Admin Firestore instance
 * Returns null if Admin SDK is not configured
 */
export function getAdminDb(): Firestore | null {
  const admin = initializeAdmin();
  return admin?.db ?? null;
}

/**
 * Check if Firebase Admin SDK is available
 */
export function isAdminConfigured(): boolean {
  return initializeAdmin() !== null;
}

export { adminApp, adminDb };
