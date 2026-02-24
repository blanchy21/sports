import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/api/response';

interface ESPNArticle {
  id: string;
  headline: string;
  description: string;
  published: string;
  images?: Array<{
    url: string;
    caption?: string;
    type?: string;
  }>;
  links: {
    web?: {
      href: string;
    };
  };
  categories?: Array<{
    description?: string;
    type?: string;
  }>;
}

interface ESPNResponse {
  articles?: ESPNArticle[];
}

interface NormalizedArticle {
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

interface NewsCache {
  data: NormalizedArticle[] | null;
  timestamp: number;
  expiresAt: number;
}

// Cache configuration - 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
let newsCache: NewsCache = {
  data: null,
  timestamp: 0,
  expiresAt: 0,
};

// ESPN API sports configuration
const ESPN_SPORTS = {
  football: { sport: 'football', league: 'nfl', name: 'NFL', icon: '🏈' },
  basketball: { sport: 'basketball', league: 'nba', name: 'NBA', icon: '🏀' },
  baseball: { sport: 'baseball', league: 'mlb', name: 'MLB', icon: '⚾' },
  hockey: { sport: 'hockey', league: 'nhl', name: 'NHL', icon: '🏒' },
  soccer: { sport: 'soccer', league: 'usa.1', name: 'MLS', icon: '⚽' },
  premierleague: { sport: 'soccer', league: 'eng.1', name: 'Premier League', icon: '⚽' },
  laliga: { sport: 'soccer', league: 'esp.1', name: 'La Liga', icon: '⚽' },
  tennis: { sport: 'tennis', league: '', name: 'Tennis', icon: '🎾' },
  golf: { sport: 'golf', league: 'pga', name: 'PGA', icon: '⛳' },
  mma: { sport: 'mma', league: 'ufc', name: 'UFC', icon: '🥊' },
  racing: { sport: 'racing', league: 'f1', name: 'F1', icon: '🏎️' },
};

/**
 * Fetch news from ESPN API for a specific sport/league
 */
async function fetchESPNNews(sport: string, league: string): Promise<ESPNArticle[]> {
  try {
    const url = league
      ? `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/news`
      : `https://site.api.espn.com/apis/site/v2/sports/${sport}/news`;

    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`ESPN API error for ${sport}/${league}: ${response.status}`);
      return [];
    }

    const data: ESPNResponse = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error(`Error fetching ESPN news for ${sport}/${league}:`, error);
    return [];
  }
}

/**
 * Normalize ESPN article to our format
 */
function normalizeArticle(
  article: ESPNArticle,
  sportConfig: { name: string; icon: string }
): NormalizedArticle {
  // Get the best image (prefer media type, fall back to header)
  const image = article.images?.find((img) => img.type === 'Media') || article.images?.[0];

  return {
    id: article.id,
    headline: article.headline,
    description: article.description || '',
    published: article.published,
    sport: sportConfig.name,
    league: sportConfig.name,
    image: image
      ? {
          url: image.url,
          caption: image.caption,
        }
      : undefined,
    link: article.links?.web?.href || '#',
    categories:
      article.categories
        ?.filter((cat) => cat.description)
        .map((cat) => cat.description!)
        .slice(0, 3) || [],
  };
}

/**
 * Fetch all sports news and combine
 */
async function fetchAllNews(): Promise<NormalizedArticle[]> {
  const allArticles: NormalizedArticle[] = [];

  // Fetch top sports in parallel
  const topSports = ['football', 'basketball', 'premierleague', 'hockey', 'baseball', 'soccer'];
  const fetchPromises = topSports.map(async (sportKey) => {
    const config = ESPN_SPORTS[sportKey as keyof typeof ESPN_SPORTS];
    if (!config) return [];

    const articles = await fetchESPNNews(config.sport, config.league);
    return articles.slice(0, 5).map((article) => normalizeArticle(article, config));
  });

  const results = await Promise.all(fetchPromises);
  results.forEach((articles) => allArticles.push(...articles));

  // Sort by published date (newest first)
  allArticles.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());

  return allArticles;
}

const ROUTE = '/api/sports/news';

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const rawLimit = parseInt(searchParams.get('limit') || '15', 10);
    const limit = Math.max(1, Math.min(50, isNaN(rawLimit) ? 15 : rawLimit));

    const now = Date.now();

    // Check if we have valid cached data
    if (newsCache.data && now < newsCache.expiresAt) {
      let filteredNews = [...newsCache.data];

      // Filter by sport if specified
      if (sport && sport !== 'all') {
        const sportConfig = ESPN_SPORTS[sport as keyof typeof ESPN_SPORTS];
        if (sportConfig) {
          filteredNews = filteredNews.filter(
            (article) => article.sport.toLowerCase() === sportConfig.name.toLowerCase()
          );
        }
      }

      filteredNews = filteredNews.slice(0, limit);

      return NextResponse.json({
        success: true,
        data: filteredNews,
        cached: true,
        timestamp: newsCache.timestamp,
      });
    }

    // Fetch fresh data from ESPN
    const articles = await fetchAllNews();

    // Update cache
    newsCache = {
      data: articles,
      timestamp: now,
      expiresAt: now + CACHE_DURATION,
    };

    let filteredNews = [...articles];

    // Filter by sport if specified
    if (sport && sport !== 'all') {
      const sportConfig = ESPN_SPORTS[sport as keyof typeof ESPN_SPORTS];
      if (sportConfig) {
        filteredNews = filteredNews.filter(
          (article) => article.sport.toLowerCase() === sportConfig.name.toLowerCase()
        );
      }
    }

    filteredNews = filteredNews.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: filteredNews,
      cached: false,
      timestamp: now,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
