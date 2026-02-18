/**
 * Sports category and event type definitions
 */

export interface SportCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  color: string;
}

export const SPORT_CATEGORIES: SportCategory[] = [
  {
    id: 'american-football',
    name: 'American Football',
    slug: 'american-football',
    icon: '🏈',
    description: 'American Football',
    color: 'bg-accent',
  },
  {
    id: 'football',
    name: 'Football',
    slug: 'football',
    icon: '⚽',
    description: 'Association Football',
    color: 'bg-primary',
  },
  {
    id: 'basketball',
    name: 'Basketball',
    slug: 'basketball',
    icon: '🏀',
    description: 'Basketball',
    color: 'bg-accent',
  },
  {
    id: 'bowling',
    name: 'Bowling',
    slug: 'bowling',
    icon: '🎳',
    description: 'Bowling',
    color: 'bg-red-500',
  },
  {
    id: 'baseball',
    name: 'Baseball',
    slug: 'baseball',
    icon: '⚾',
    description: 'Baseball',
    color: 'bg-accent',
  },
  {
    id: 'hockey',
    name: 'Ice Hockey',
    slug: 'hockey',
    icon: '🏒',
    description: 'Ice Hockey',
    color: 'bg-red-500',
  },
  {
    id: 'tennis',
    name: 'Tennis',
    slug: 'tennis',
    icon: '🎾',
    description: 'Tennis',
    color: 'bg-yellow-500',
  },
  {
    id: 'golf',
    name: 'Golf',
    slug: 'golf',
    icon: '⛳',
    description: 'Golf',
    color: 'bg-primary',
  },
  {
    id: 'mma',
    name: 'MMA/Boxing',
    slug: 'mma',
    icon: '🥊',
    description: 'Mixed Martial Arts & Boxing',
    color: 'bg-red-600',
  },
  {
    id: 'martial-arts',
    name: 'Martial Arts',
    slug: 'martial-arts',
    icon: '🥋',
    description: 'Judo, Karate, Taekwondo & more',
    color: 'bg-gray-700',
  },
  {
    id: 'motorsports',
    name: 'Motorsports',
    slug: 'motorsports',
    icon: '🏁',
    description: 'Racing & Motorsports',
    color: 'bg-gray-600',
  },
  {
    id: 'cricket',
    name: 'Cricket',
    slug: 'cricket',
    icon: '🏏',
    description: 'Cricket',
    color: 'bg-yellow-600',
  },
  {
    id: 'rugby',
    name: 'Rugby',
    slug: 'rugby',
    icon: '🏉',
    description: 'Rugby Union & League',
    color: 'bg-primary',
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    slug: 'volleyball',
    icon: '🏐',
    description: 'Volleyball',
    color: 'bg-accent',
  },
  {
    id: 'badminton',
    name: 'Badminton',
    slug: 'badminton',
    icon: '🏸',
    description: 'Badminton',
    color: 'bg-purple-600',
  },
  {
    id: 'table-tennis',
    name: 'Table Tennis',
    slug: 'table-tennis',
    icon: '🏓',
    description: 'Table Tennis',
    color: 'bg-accent',
  },
  {
    id: 'swimming',
    name: 'Swimming',
    slug: 'swimming',
    icon: '🏊',
    description: 'Swimming',
    color: 'bg-accent',
  },
  {
    id: 'athletics',
    name: 'Athletics',
    slug: 'athletics',
    icon: '🏃',
    description: 'Track & Field',
    color: 'bg-red-400',
  },
  {
    id: 'cycling',
    name: 'Cycling',
    slug: 'cycling',
    icon: '🚴',
    description: 'Cycling',
    color: 'bg-yellow-400',
  },
  {
    id: 'skiing',
    name: 'Skiing',
    slug: 'skiing',
    icon: '⛷️',
    description: 'Skiing & Snowboarding',
    color: 'bg-accent',
  },
  {
    id: 'surfing',
    name: 'Surfing',
    slug: 'surfing',
    icon: '🏄',
    description: 'Surfing',
    color: 'bg-cyan-500',
  },
  {
    id: 'wrestling',
    name: 'Wrestling',
    slug: 'wrestling',
    icon: '🤼',
    description: 'Wrestling',
    color: 'bg-gray-700',
  },
  {
    id: 'field-hockey',
    name: 'Field Hockey',
    slug: 'field-hockey',
    icon: '🏑',
    description: 'Field Hockey',
    color: 'bg-green-600',
  },
  {
    id: 'gymnastics',
    name: 'Gymnastics',
    slug: 'gymnastics',
    icon: '🤸',
    description: 'Gymnastics',
    color: 'bg-pink-500',
  },
  {
    id: 'handball',
    name: 'Handball',
    slug: 'handball',
    icon: '🤾',
    description: 'Handball',
    color: 'bg-blue-600',
  },
  {
    id: 'weightlifting',
    name: 'Weightlifting',
    slug: 'weightlifting',
    icon: '🏋️',
    description: 'Weightlifting',
    color: 'bg-gray-800',
  },
  {
    id: 'archery',
    name: 'Archery',
    slug: 'archery',
    icon: '🏹',
    description: 'Archery',
    color: 'bg-brown-500',
  },
  {
    id: 'equestrian',
    name: 'Equestrian',
    slug: 'equestrian',
    icon: '🏇',
    description: 'Horse Racing & Equestrian',
    color: 'bg-amber-600',
  },
  {
    id: 'snooker',
    name: 'Snooker',
    slug: 'snooker',
    icon: '🎱',
    description: 'Snooker & Pool',
    color: 'bg-green-800',
  },
  {
    id: 'softball',
    name: 'Softball',
    slug: 'softball',
    icon: '🥎',
    description: 'Softball',
    color: 'bg-yellow-500',
  },
  {
    id: 'olympics',
    name: 'Olympics',
    slug: 'olympics',
    icon: '🏅',
    description: 'Olympic Games',
    color: 'bg-amber-500',
  },
  {
    id: 'padel',
    name: 'Padel',
    slug: 'padel',
    icon: '🎾',
    description: 'Padel Tennis',
    color: 'bg-blue-500',
  },
  {
    id: 'sailing',
    name: 'Sailing',
    slug: 'sailing',
    icon: '⛵',
    description: 'Sailing',
    color: 'bg-accent',
  },
  {
    id: 'chess',
    name: 'Chess',
    slug: 'chess',
    icon: '♟️',
    description: 'Chess',
    color: 'bg-gray-800',
  },
  {
    id: 'climbing',
    name: 'Climbing',
    slug: 'climbing',
    icon: '🧗',
    description: 'Rock Climbing',
    color: 'bg-gray-600',
  },
  {
    id: 'darts',
    name: 'Darts',
    slug: 'darts',
    icon: '🎯',
    description: 'Darts',
    color: 'bg-red-700',
  },
  {
    id: 'esports',
    name: 'Esports',
    slug: 'esports',
    icon: '🎮',
    description: 'Electronic Sports',
    color: 'bg-purple-700',
  },
  {
    id: 'general',
    name: 'General',
    slug: 'general',
    icon: '🏆',
    description: 'General Sports',
    color: 'bg-purple-500',
  },
];

export interface SportsEvent {
  id: string;
  name: string;
  date: string;
  icon: string;
  sport: string;
  league?: string;
  teams?: {
    home: string;
    away: string;
  };
  venue?: string;
  status: 'upcoming' | 'live' | 'finished';
}

export interface EventsApiResponse {
  success: boolean;
  data: SportsEvent[];
  cached: boolean;
  timestamp: number;
  error?: string;
}

export interface MatchThread {
  eventId: string;
  permlink: string;
  event: SportsEvent;
  biteCount: number;
  isOpen: boolean;
  isLive: boolean;
}
