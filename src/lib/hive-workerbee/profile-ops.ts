/**
 * Hive profile update operations.
 * No WASM calls — safe for client-side bundling.
 */

import { HIVE_NODES } from './nodes';

// ---------------------------------------------------------------------------
// Profile update
// ---------------------------------------------------------------------------

export interface ProfileUpdateData {
  name?: string;
  about?: string;
  location?: string;
  website?: string;
  profile_image?: string;
  cover_image?: string;
}

/**
 * Update a Hive user's profile metadata using account_update2.
 * This operation only requires posting authority (not active key).
 * Safe for client bundling — uses direct fetch(), no WASM deps.
 */
export async function updateHiveProfile(
  username: string,
  profileData: ProfileUpdateData,
  broadcastFn: (
    ops: [string, Record<string, unknown>][],
    keyType?: 'posting' | 'active'
  ) => Promise<{ success: boolean; transactionId?: string; error?: string }>
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Profile update must be performed in browser environment' };
  }

  try {
    // Fetch current account to get existing metadata via direct API call
    const response = await fetch(HIVE_NODES[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_accounts',
        params: [[username]],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.status}`);
    }

    const data = await response.json();
    const accounts = data.result as Array<Record<string, unknown>>;

    if (!accounts || accounts.length === 0) {
      throw new Error('Account not found');
    }

    const account = accounts[0];

    // Parse existing posting_json_metadata (this is where profile data lives)
    let existingMetadata: Record<string, unknown> = {};
    try {
      const postingMetadata = account.posting_json_metadata as string;
      if (postingMetadata) {
        existingMetadata = JSON.parse(postingMetadata);
      }
    } catch {
      existingMetadata = {};
    }

    // Merge existing profile with new data
    const existingProfile = (existingMetadata.profile as Record<string, unknown>) || {};
    const updatedProfile: Record<string, unknown> = { ...existingProfile };

    if (profileData.name !== undefined) updatedProfile.name = profileData.name;
    if (profileData.about !== undefined) updatedProfile.about = profileData.about;
    if (profileData.location !== undefined) updatedProfile.location = profileData.location;
    if (profileData.website !== undefined) updatedProfile.website = profileData.website;
    if (profileData.profile_image !== undefined)
      updatedProfile.profile_image = profileData.profile_image;
    if (profileData.cover_image !== undefined) updatedProfile.cover_image = profileData.cover_image;

    const updatedMetadata = { ...existingMetadata, profile: updatedProfile };

    const operations: [string, Record<string, unknown>][] = [
      [
        'account_update2',
        {
          account: username,
          json_metadata: '',
          posting_json_metadata: JSON.stringify(updatedMetadata),
          extensions: [],
        },
      ],
    ];

    const result = await broadcastFn(operations, 'posting');

    if (!result.success) {
      throw new Error(result.error || 'Profile update transaction failed');
    }

    return { success: true, transactionId: result.transactionId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
