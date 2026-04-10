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

// User types
export type { User, FollowRelationship } from './user';

// Post types
export type { Post } from './post';

// Sports types
export type { SportCategory, SportsEvent, EventsApiResponse } from './sports';
export { SPORT_CATEGORIES } from './sports';

// Community types
export type {
  CommunityType,
  Community,
  CommunityMember,
  CreateCommunityInput,
  UpdateCommunityInput,
  CommunityFilters,
  CommunityListResult,
} from './community';

// Crypto types
export type { CryptoPriceData } from './crypto';

// UI types
export type { AuthType, AuthState, ThemeState } from './ui';

// Media types
export type { ESPNNewsArticle, ESPNNewsApiResponse } from './media';
