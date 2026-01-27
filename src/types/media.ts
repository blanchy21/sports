/**
 * Media and news-related type definitions
 */

export interface ESPNNewsArticle {
  id: string;
  headline: string;
  description: string;
  published: string;
  sport: string;
  league: string;
  image?: {
    url: string;
    caption?: string;
  };
  link: string;
  categories: string[];
}

export interface ESPNNewsApiResponse {
  success: boolean;
  data: ESPNNewsArticle[];
  cached: boolean;
  timestamp: number;
  error?: string;
}
