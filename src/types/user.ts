/**
 * User-related type definitions
 */

export interface User {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  isHiveAuth: boolean;
  hiveUsername?: string;
  reputation?: number;
  reputationFormatted?: string;
  // Liquid balances
  liquidHiveBalance?: number;
  liquidHbdBalance?: number;
  // Savings balances
  savingsHiveBalance?: number;
  savingsHbdBalance?: number;
  // Combined balances (for backward compatibility)
  hiveBalance?: number;
  hbdBalance?: number; // Hive Backed Dollars
  hivePower?: number; // HIVE POWER
  sbBalance?: number; // Sports Bucks
  rcBalance?: number; // Resource Credits
  rcPercentage?: number;
  // Savings data
  savingsApr?: number; // HBD savings interest rate
  pendingWithdrawals?: Array<{
    id: string;
    amount: string;
    to: string;
    memo: string;
    requestId: number;
    from: string;
    timestamp: string;
  }>;
  // Hive profile fields
  hiveProfile?: {
    name?: string;
    about?: string;
    location?: string;
    website?: string;
    coverImage?: string;
    profileImage?: string;
  };
  // Hive account stats
  hiveStats?: {
    postCount: number;
    commentCount: number;
    voteCount: number;
    followers?: number;
    following?: number;
  };
  // Additional Hive account data
  lastPost?: Date;
  lastVote?: Date;
  canVote?: boolean;
  votingPower?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowRelationship {
  follower: string;
  following: string;
  followedAt: string;
}
