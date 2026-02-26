/**
 * Community-related type definitions
 */

export type CommunityType = 'public' | 'private' | 'invite-only';
export type CommunityMemberRole = 'admin' | 'moderator' | 'member';
export type CommunityMemberStatus = 'active' | 'pending' | 'banned';
export type CommunityInviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Community {
  id: string;
  slug: string; // URL-friendly name (unique)
  name: string; // Display name
  title: string; // Kept for backward compatibility (same as name)
  about: string; // Short description
  description: string; // Extended description/rules
  sportCategory: string; // Links to SPORT_CATEGORIES
  type: CommunityType;
  avatar?: string; // Image URL
  coverImage?: string; // Cover image URL
  createdBy: string; // User ID (User ID or Hive username)
  createdByHive?: string; // Hive username if applicable
  createdAt: Date | string;
  updatedAt: Date | string;
  memberCount: number; // Denormalized for performance
  postCount: number; // Denormalized
  isVerified: boolean; // Admin-verified communities
  // Legacy fields for backward compatibility
  subscribers: number; // Alias for memberCount
  posts: number; // Alias for postCount
  created: string; // Alias for createdAt (ISO string)
  team: CommunityMember[]; // Legacy team array
}

export interface CommunityMember {
  id: string; // `{communityId}_{userId}`
  communityId: string;
  userId: string; // User ID or Hive username
  username: string; // Display username
  hiveUsername?: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  joinedAt: Date | string;
  invitedBy?: string; // For invite-only communities
}

export interface CommunityInvite {
  id: string;
  communityId: string;
  invitedEmail?: string; // For email invites
  invitedHiveUser?: string; // For Hive user invites
  invitedBy: string;
  status: CommunityInviteStatus;
  createdAt: Date | string;
  expiresAt: Date | string;
}

export interface CreateCommunityInput {
  name: string;
  slug?: string; // Auto-generated if not provided
  about: string;
  description?: string;
  sportCategory: string;
  type: CommunityType;
  avatar?: string;
  coverImage?: string;
}

export interface UpdateCommunityInput {
  name?: string;
  about?: string;
  description?: string;
  sportCategory?: string;
  type?: CommunityType;
  avatar?: string;
  coverImage?: string;
}

export interface CommunityFilters {
  search?: string;
  sportCategory?: string;
  type?: CommunityType;
  sort?: 'memberCount' | 'postCount' | 'createdAt' | 'name';
  limit?: number;
  offset?: number;
  memberUserId?: string;
}

export interface CommunityListResult {
  communities: Community[];
  total: number;
  hasMore: boolean;
}
