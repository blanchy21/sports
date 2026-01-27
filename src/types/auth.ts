import { AuthUser } from '@/lib/firebase/auth';

// Enhanced auth types that support both Hive and Firebase authentication
export type AuthType = 'hive' | 'soft' | 'guest';

export interface PendingWithdrawal {
  id: string;
  amount: string;
  asset: string;
  created: string;
  [key: string]: unknown;
}

export interface HiveProfile {
  name?: string;
  about?: string;
  location?: string;
  website?: string;
  cover_image?: string;
  profile_image?: string;
  [key: string]: unknown;
}

export interface HiveStats {
  posts?: number;
  comments?: number;
  followers?: number;
  following?: number;
  reputation?: number;
  [key: string]: unknown;
}

export interface AiohaLoginResult {
  username?: string;
  success?: boolean;
  error?: string;
  user?: {
    username?: string;
    name?: string;
    session?: string;
    sessionId?: string;
    session_id?: string;
    [key: string]: unknown;
  };
  account?: {
    name?: string;
    username?: string;
    [key: string]: unknown;
  };
  session?: string;
  sessionId?: string;
  session_id?: string;
  [key: string]: unknown;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  bio?: string;
  isHiveAuth: boolean;
  hiveUsername?: string;
  createdAt: Date;
  updatedAt: Date;

  // Hive-specific fields (only for Hive users)
  reputation?: number;
  reputationFormatted?: string;
  liquidHiveBalance?: number;
  liquidHbdBalance?: number;
  savingsHiveBalance?: number;
  savingsHbdBalance?: number;
  hiveBalance?: number;
  hbdBalance?: number;
  hivePower?: number;
  rcPercentage?: number;
  savingsApr?: number;
  pendingWithdrawals?: PendingWithdrawal[];
  hiveProfile?: HiveProfile;
  hiveStats?: HiveStats;
}

export interface AuthState {
  user: User | null;
  authType: AuthType;
  isAuthenticated: boolean;
  isLoading: boolean;
  isClient: boolean;
}

export interface AuthActions {
  login: (user: User, authType: AuthType) => void;
  loginWithHiveUser: (hiveUsername: string) => Promise<void>;
  loginWithAioha: (loginResult?: AiohaLoginResult) => Promise<void>;
  loginWithSupabase: (authUser: AuthUser) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  upgradeToHive: (hiveUsername: string) => Promise<void>;
}

// Aioha-specific types

export interface AiohaProvider {
  name: string;
  type: string;
  isAvailable: boolean;
  isEnabled: boolean;
}

// UI-specific component prop types
// Note: AuthModalProps is defined in @/components/auth/types

export interface AccountBadgeProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  showType?: boolean;
}

// Post types for dual system
export interface SoftPost {
  id: string;
  authorId: string;
  // Author profile data for display
  authorUsername: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  // Post content
  title: string;
  content: string;
  excerpt?: string;
  permlink: string;
  tags: string[];
  sportCategory?: string;
  featuredImage?: string;
  // Community data (optional)
  communityId?: string;
  communitySlug?: string;
  communityName?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  // Hive integration
  isPublishedToHive: boolean;
  hivePermlink?: string;
  // Engagement (soft tracking - no rewards)
  viewCount?: number;
  likeCount?: number;
}

export interface HivePost {
  author: string;
  permlink: string;
  title: string;
  body: string;
  created: string;
  // ... other Hive post fields
}

export type Post = SoftPost | HivePost;

// Upgrade flow types
export interface UpgradeFlowProps {
  user: User;
  onUpgrade: (hiveUsername: string) => Promise<void>;
  onCancel: () => void;
}
