import { getAdminDb } from './admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Server-side profile utilities for use in API routes
 * Uses the Firebase Admin SDK
 */

/**
 * Update the lastActiveAt timestamp for a user
 * Call this from API routes when users perform significant actions
 *
 * Actions that should trigger this:
 * - Creating a post
 * - Creating a comment
 * - Liking content
 * - Following someone
 */
export async function updateUserLastActiveAt(userId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    console.warn('[profiles] Admin DB not configured, skipping lastActiveAt update');
    return;
  }

  try {
    const profileRef = db.collection('profiles').doc(userId);
    await profileRef.update({
      lastActiveAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    // Log but don't throw - this is a non-critical update
    console.error('[profiles] Error updating lastActiveAt:', error);
  }
}

/**
 * Get inactive users for cleanup/warning purposes
 * Returns users who haven't been active for the specified number of days
 */
export async function getInactiveUsers(
  inactiveDays: number,
  limitCount: number = 100
): Promise<Array<{ id: string; username: string; email?: string; lastActiveAt: Date }>> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Admin DB not configured');
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

  try {
    // Query for soft users (not Hive users) who are inactive
    const snapshot = await db.collection('profiles')
      .where('isHiveUser', '==', false)
      .where('lastActiveAt', '<', cutoffDate)
      .limit(limitCount)
      .get();

    const users: Array<{ id: string; username: string; email?: string; lastActiveAt: Date }> = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        id: doc.id,
        username: data.username,
        email: data.email,
        lastActiveAt: data.lastActiveAt?.toDate() || data.createdAt?.toDate() || new Date(0)
      });
    });

    return users;
  } catch (error) {
    console.error('[profiles] Error getting inactive users:', error);
    throw error;
  }
}

/**
 * Get users who have never had lastActiveAt set
 * These are older accounts created before we added tracking
 */
export async function getUsersWithoutLastActive(
  limitCount: number = 100
): Promise<Array<{ id: string; username: string; createdAt: Date }>> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Admin DB not configured');
  }

  try {
    // Query for soft users without lastActiveAt
    const snapshot = await db.collection('profiles')
      .where('isHiveUser', '==', false)
      .where('lastActiveAt', '==', null)
      .limit(limitCount)
      .get();

    const users: Array<{ id: string; username: string; createdAt: Date }> = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        id: doc.id,
        username: data.username,
        createdAt: data.createdAt?.toDate() || new Date()
      });
    });

    return users;
  } catch (error) {
    console.error('[profiles] Error getting users without lastActive:', error);
    throw error;
  }
}

/**
 * Backfill lastActiveAt for users who don't have it
 * Sets it to their updatedAt or createdAt timestamp
 */
export async function backfillLastActiveAt(userId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    return;
  }

  try {
    const profileRef = db.collection('profiles').doc(userId);
    const doc = await profileRef.get();

    if (!doc.exists) return;

    const data = doc.data();
    if (data?.lastActiveAt) return; // Already has lastActiveAt

    // Use updatedAt or createdAt as fallback
    const fallbackDate = data?.updatedAt || data?.createdAt || FieldValue.serverTimestamp();

    await profileRef.update({
      lastActiveAt: fallbackDate
    });
  } catch (error) {
    console.error('[profiles] Error backfilling lastActiveAt:', error);
  }
}
