import { HiveAccount } from '../lib/shared/types';

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

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: User;
  featuredImage?: string;
  sport: SportCategory;
  tags: string[];
  isPublished: boolean;
  isDraft: boolean;
  hivePostId?: string;
  hiveUrl?: string;
  author_permlink?: string; // For Hive posts
  permlink?: string; // For Hive posts
  pendingPayout?: number; // Hive pending payout
  netVotes?: number; // Hive net votes
  upvotes: number;
  comments: number;
  readTime: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  postId: string;
  parentId?: string;
  replies: Comment[];
  upvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SportCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  color: string;
}

export type AuthType = "guest" | "soft" | "hive";

export interface AuthState {
  user: User | null;
  authType: AuthType;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ThemeState {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
}

export interface NotificationItem {
  id: string;
  type: "upvote" | "comment" | "follow" | "mention";
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actor?: User;
  postId?: string;
  commentId?: string;
}

export const SPORT_CATEGORIES: SportCategory[] = [
  {
    id: "american-football",
    name: "American Football",
    slug: "american-football",
    icon: "🏈",
    description: "American Football",
    color: "bg-orange-500",
  },
  {
    id: "football",
    name: "Football",
    slug: "football",
    icon: "⚽",
    description: "Association Football",
    color: "bg-green-500",
  },
  {
    id: "basketball",
    name: "Basketball",
    slug: "basketball",
    icon: "🏀",
    description: "Basketball",
    color: "bg-orange-600",
  },
  {
    id: "baseball",
    name: "Baseball",
    slug: "baseball",
    icon: "⚾",
    description: "Baseball",
    color: "bg-blue-600",
  },
  {
    id: "hockey",
    name: "Hockey",
    slug: "hockey",
    icon: "🏒",
    description: "Ice Hockey",
    color: "bg-red-500",
  },
  {
    id: "tennis",
    name: "Tennis",
    slug: "tennis",
    icon: "🎾",
    description: "Tennis",
    color: "bg-yellow-500",
  },
  {
    id: "golf",
    name: "Golf",
    slug: "golf",
    icon: "⛳",
    description: "Golf",
    color: "bg-green-600",
  },
  {
    id: "mma",
    name: "MMA/Boxing",
    slug: "mma",
    icon: "🥊",
    description: "Mixed Martial Arts & Boxing",
    color: "bg-red-600",
  },
  {
    id: "motorsports",
    name: "Motorsports",
    slug: "motorsports",
    icon: "🏁",
    description: "Racing & Motorsports",
    color: "bg-gray-600",
  },
  {
    id: "cricket",
    name: "Cricket",
    slug: "cricket",
    icon: "🏏",
    description: "Cricket",
    color: "bg-yellow-600",
  },
  {
    id: "rugby",
    name: "Rugby",
    slug: "rugby",
    icon: "🏉",
    description: "Rugby Union & League",
    color: "bg-green-700",
  },
  {
    id: "volleyball",
    name: "Volleyball",
    slug: "volleyball",
    icon: "🏐",
    description: "Volleyball",
    color: "bg-blue-500",
  },
  {
    id: "badminton",
    name: "Badminton",
    slug: "badminton",
    icon: "🏸",
    description: "Badminton",
    color: "bg-purple-600",
  },
  {
    id: "table-tennis",
    name: "Table Tennis",
    slug: "table-tennis",
    icon: "🏓",
    description: "Table Tennis",
    color: "bg-orange-400",
  },
  {
    id: "swimming",
    name: "Swimming",
    slug: "swimming",
    icon: "🏊",
    description: "Swimming",
    color: "bg-blue-400",
  },
  {
    id: "athletics",
    name: "Athletics",
    slug: "athletics",
    icon: "🏃",
    description: "Track & Field",
    color: "bg-red-400",
  },
  {
    id: "cycling",
    name: "Cycling",
    slug: "cycling",
    icon: "🚴",
    description: "Cycling",
    color: "bg-yellow-400",
  },
  {
    id: "skiing",
    name: "Skiing",
    slug: "skiing",
    icon: "⛷️",
    description: "Skiing & Snowboarding",
    color: "bg-blue-300",
  },
  {
    id: "surfing",
    name: "Surfing",
    slug: "surfing",
    icon: "🏄",
    description: "Surfing",
    color: "bg-cyan-500",
  },
  {
    id: "wrestling",
    name: "Wrestling",
    slug: "wrestling",
    icon: "🤼",
    description: "Wrestling",
    color: "bg-gray-700",
  },
  {
    id: "gymnastics",
    name: "Gymnastics",
    slug: "gymnastics",
    icon: "🤸",
    description: "Gymnastics",
    color: "bg-pink-500",
  },
  {
    id: "weightlifting",
    name: "Weightlifting",
    slug: "weightlifting",
    icon: "🏋️",
    description: "Weightlifting",
    color: "bg-gray-800",
  },
  {
    id: "archery",
    name: "Archery",
    slug: "archery",
    icon: "🏹",
    description: "Archery",
    color: "bg-brown-500",
  },
  {
    id: "equestrian",
    name: "Equestrian",
    slug: "equestrian",
    icon: "🏇",
    description: "Horse Racing & Equestrian",
    color: "bg-amber-600",
  },
  {
    id: "sailing",
    name: "Sailing",
    slug: "sailing",
    icon: "⛵",
    description: "Sailing",
    color: "bg-blue-700",
  },
  {
    id: "climbing",
    name: "Climbing",
    slug: "climbing",
    icon: "🧗",
    description: "Rock Climbing",
    color: "bg-gray-600",
  },
  {
    id: "darts",
    name: "Darts",
    slug: "darts",
    icon: "🎯",
    description: "Darts",
    color: "bg-red-700",
  },
  {
    id: "esports",
    name: "Esports",
    slug: "esports",
    icon: "🎮",
    description: "Electronic Sports",
    color: "bg-purple-700",
  },
  {
    id: "general",
    name: "General",
    slug: "general",
    icon: "🏆",
    description: "General Sports",
    color: "bg-purple-500",
  },
];

export interface HiveAuthUser {
  username: string;
  isAuthenticated: boolean;
  account?: HiveAccount;
}

export interface CryptoPriceData {
  bitcoin: {
    usd: number;
    usd_24h_change?: number;
    market_cap?: number;
  };
  ethereum: {
    usd: number;
    usd_24h_change?: number;
    market_cap?: number;
  };
  hive: {
    usd: number;
    usd_24h_change?: number;
  };
  hive_dollar: {
    usd: number;
    usd_24h_change?: number;
  };
}

export interface PriceContextType {
  bitcoinPrice: number | null;
  ethereumPrice: number | null;
  hivePrice: number | null;
  hbdPrice: number | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshPrices: () => Promise<void>;
}
