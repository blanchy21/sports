/**
 * Central type exports
 *
 * This module re-exports all domain-specific types for convenient importing.
 * Individual domain types can also be imported directly from their files:
 *
 * @example
 * // Import everything
 * import { User, Post, Community } from '@/types';
 *
 * // Import from specific domain
 * import type { User } from '@/types/user';
 * import type { Community } from '@/types/community';
 */

// Re-export shared Hive types
import { HiveAccount, HiveAuthUser } from '../lib/shared/types';
export type { HiveAccount, HiveAuthUser };

// User types
export type { User, FollowRelationship } from './user';

// Post types
export type { Post, Comment } from './post';

// Sports types
export type { SportCategory, SportCategoryId, SportsEvent, EventsApiResponse } from './sports';
export { SPORT_CATEGORIES } from './sports';

// Community types
export type {
  CommunityType,
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityInviteStatus,
  Community,
  CommunityMember,
  CommunityInvite,
  CreateCommunityInput,
  UpdateCommunityInput,
  CommunityFilters,
  CommunityListResult,
} from './community';

// Crypto types
export type { CryptoPriceData, PriceContextType } from './crypto';

// UI types
export type { AuthType, AuthState, ThemeState, NotificationItem, ModalState } from './ui';

// API response types
export type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from './api';

// Media types
export type { ESPNNewsArticle, ESPNNewsApiResponse } from './media';
