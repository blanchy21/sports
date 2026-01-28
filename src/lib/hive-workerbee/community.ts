/**
 * Community Functions
 *
 * This module provides community-related functions.
 * Note: Community data is now stored in Firestore, not on Hive blockchain.
 * These functions call the API routes which interact with Firestore.
 *
 * For direct Firestore access, use @/lib/firebase/communities.ts
 */

import { Community, CommunityMember, CommunityFilters, CommunityListResult } from '@/types';
import { workerBee as workerBeeLog, error as logError } from './logger';

export type { CommunityFilters };

export interface CommunityResult {
  communities: Community[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Fetch communities from the API
 * @param filters - Community filters
 * @returns Filtered communities
 */
export async function fetchCommunities(filters: CommunityFilters = {}): Promise<CommunityResult> {
  try {
    workerBeeLog('Fetching communities via API', undefined, filters);

    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.sportCategory) params.set('sportCategory', filters.sportCategory);
    if (filters.type) params.set('type', filters.type);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.limit) params.set('limit', String(filters.limit));

    const response = await fetch(`/api/communities?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch communities: ${response.statusText}`);
    }

    const data: CommunityListResult & { success: boolean } = await response.json();

    return {
      communities: data.communities || [],
      hasMore: data.hasMore || false,
    };
  } catch (error) {
    logError(
      'Error fetching communities',
      'fetchCommunities',
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}

/**
 * Fetch community details by ID
 * @param communityId - Community ID or slug
 * @returns Community details
 */
export async function fetchCommunityDetails(communityId: string): Promise<Community | null> {
  try {
    workerBeeLog('Fetching community details via API', undefined, { communityId });

    const response = await fetch(`/api/communities/${communityId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch community: ${response.statusText}`);
    }

    const data = await response.json();
    return data.community || null;
  } catch (error) {
    logError(
      'Error fetching community details',
      'fetchCommunityDetails',
      error instanceof Error ? error : undefined
    );
    return null;
  }
}

/**
 * Fetch community members
 * @param communityId - Community ID
 * @param limit - Number of members to fetch
 * @returns Community members
 */
export async function fetchCommunityMembers(
  communityId: string,
  limit: number = 50
): Promise<CommunityMember[]> {
  try {
    workerBeeLog('Fetching community members via API', undefined, { communityId, limit });

    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('status', 'active');

    const response = await fetch(`/api/communities/${communityId}/members?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch members: ${response.statusText}`);
    }

    const data = await response.json();
    return data.members || [];
  } catch (error) {
    logError(
      'Error fetching community members',
      'fetchCommunityMembers',
      error instanceof Error ? error : undefined
    );
    return [];
  }
}

/**
 * Subscribe to a community (join)
 * @param communityId - Community ID
 * @param userId - User ID
 * @param username - Username
 * @param hiveUsername - Hive username (optional)
 * @returns Subscription result
 */
export async function subscribeToCommunity(
  communityId: string,
  userId: string,
  username?: string,
  hiveUsername?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    workerBeeLog('Subscribing to community via API', undefined, { communityId, userId });

    const response = await fetch(`/api/communities/${communityId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username: username || userId, hiveUsername }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to join community' };
    }

    return { success: true };
  } catch (error) {
    logError(
      'Error subscribing to community',
      'subscribeToCommunity',
      error instanceof Error ? error : undefined
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unsubscribe from a community (leave)
 * @param communityId - Community ID
 * @param userId - User ID
 * @returns Unsubscription result
 */
export async function unsubscribeFromCommunity(
  communityId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    workerBeeLog('Unsubscribing from community via API', undefined, { communityId, userId });

    const response = await fetch(`/api/communities/${communityId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to leave community' };
    }

    return { success: true };
  } catch (error) {
    logError(
      'Error unsubscribing from community',
      'unsubscribeFromCommunity',
      error instanceof Error ? error : undefined
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if user is subscribed to a community
 * @param communityId - Community ID
 * @param userId - User ID
 * @returns Subscription status
 */
export async function isSubscribedToCommunity(
  communityId: string,
  userId: string
): Promise<boolean> {
  try {
    if (!userId) return false;

    const members = await fetchCommunityMembers(communityId, 1000);
    return members.some((m) => m.userId === userId && m.status === 'active');
  } catch (error) {
    logError(
      'Error checking community subscription',
      'isSubscribedToCommunity',
      error instanceof Error ? error : undefined
    );
    return false;
  }
}
