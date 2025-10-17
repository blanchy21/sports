"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Plus, TrendingUp, Users, Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Post, SPORT_CATEGORIES } from "@/types";
import { fetchSportsblockPosts, SportsblockPost } from "@/lib/hive-workerbee/content";
import { formatAsset, calculatePendingPayout } from "@/lib/hive/utils";

// Mock data for development
const mockPosts: Post[] = [
  {
    id: "1",
    title: "The Evolution of Basketball: From Naismith to the Modern NBA",
    content: "Basketball has evolved tremendously since Dr. James Naismith invented the game in 1891...",
    excerpt: "Explore the fascinating journey of basketball from its humble beginnings to becoming one of the world's most popular sports.",
    author: {
      id: "1",
      username: "basketball_historian",
      displayName: "Sarah Johnson",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=100&h=100&fit=crop&crop=face",
      isHiveAuth: true,
      hiveUsername: "basketball_historian",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date(),
    },
    featuredImage: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=400&fit=crop",
    sport: SPORT_CATEGORIES.find(s => s.id === "basketball") || SPORT_CATEGORIES[0],
    tags: ["basketball", "history", "NBA", "evolution"],
    isPublished: true,
    isDraft: false,
    hivePostId: "hive_post_1",
    hiveUrl: "https://hive.blog/@basketball_historian/evolution-basketball",
    upvotes: 247,
    comments: 23,
    readTime: 8,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    publishedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    title: "Soccer Tactics: The Rise of the False 9 Position",
    content: "The false 9 position has revolutionized modern soccer tactics...",
    excerpt: "Learn how the false 9 position has changed the game and why it's become essential for top teams worldwide.",
    author: {
      id: "2",
      username: "soccer_tactician",
      displayName: "Miguel Rodriguez",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      isHiveAuth: true,
      hiveUsername: "soccer_tactician",
      createdAt: new Date("2023-02-01"),
      updatedAt: new Date(),
    },
    featuredImage: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=400&fit=crop",
    sport: SPORT_CATEGORIES.find(s => s.id === "football") || SPORT_CATEGORIES[0],
    tags: ["soccer", "tactics", "false9", "football"],
    isPublished: true,
    isDraft: false,
    hivePostId: "hive_post_2",
    hiveUrl: "https://hive.blog/@soccer_tactician/false9-tactics",
    upvotes: 189,
    comments: 31,
    readTime: 6,
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
    publishedAt: new Date("2024-01-14"),
  },
  {
    id: "3",
    title: "Tennis Mental Game: Staying Focused Under Pressure",
    content: "The mental aspect of tennis is often overlooked but crucial for success...",
    excerpt: "Discover the psychological techniques used by top tennis players to maintain focus and composure during high-pressure moments.",
    author: {
      id: "3",
      username: "tennis_psychologist",
      displayName: "Dr. Emma Chen",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      isHiveAuth: false,
      createdAt: new Date("2023-03-01"),
      updatedAt: new Date(),
    },
    featuredImage: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=400&fit=crop",
    sport: SPORT_CATEGORIES.find(s => s.id === "tennis") || SPORT_CATEGORIES[0],
    tags: ["tennis", "psychology", "mental-game", "focus"],
    isPublished: true,
    isDraft: false,
    upvotes: 156,
    comments: 19,
    readTime: 5,
    createdAt: new Date("2024-01-13"),
    updatedAt: new Date("2024-01-13"),
    publishedAt: new Date("2024-01-13"),
  },
];

const stats = [
  { label: "Posts Today", value: "47", icon: TrendingUp },
  { label: "Active Users", value: "2.3K", icon: Users },
  { label: "Total Rewards", value: "$1.2K", icon: Award },
];

export default function FeedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedSport, setSelectedSport] = React.useState<string>("");
  const [posts, setPosts] = React.useState<SportsblockPost[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  // Load posts from Hive blockchain
  React.useEffect(() => {
    loadPosts();
  }, [selectedSport]);

  // Listen for sport filter changes from the navigation
  React.useEffect(() => {
    const handleSportFilterChange = (event: CustomEvent) => {
      setSelectedSport(event.detail);
    };

    // Load saved sport filter from localStorage
    const savedSport = localStorage.getItem('selectedSport');
    if (savedSport) {
      setSelectedSport(savedSport);
    }

    window.addEventListener('sportFilterChanged', handleSportFilterChange as EventListener);
    
    return () => {
      window.removeEventListener('sportFilterChanged', handleSportFilterChange as EventListener);
    };
  }, []);

  const loadPosts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchSportsblockPosts({
        sportCategory: selectedSport || undefined,
        limit: 20,
        sort: 'created',
      });
      
      setPosts(result.posts);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts. Please try again later.');
      // Fallback to mock data
      setPosts(mockPosts as unknown as SportsblockPost[]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter posts based on selected sport
  const filteredPosts = React.useMemo(() => {
    if (!selectedSport) {
      return posts;
    }
    return posts.filter(post => post.sportCategory === selectedSport);
  }, [posts, selectedSport]);

  // Get the selected sport name for display
  const selectedSportName = React.useMemo(() => {
    if (!selectedSport) return null;
    return SPORT_CATEGORIES.find(sport => sport.id === selectedSport)?.name;
  }, [selectedSport]);

  if (!user) {
    return null; // Will redirect
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Write Post Section */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Avatar
              src={user?.avatar}
              fallback={user?.username || "?"}
              alt={user?.displayName || user?.username || "Guest"}
              size="md"
            />
            <div className="flex-1">
              <input
                type="text"
                placeholder="What's happening in sports today?"
                className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                disabled={!user}
                onClick={() => user && router.push("/publish")}
                readOnly
              />
            </div>
            <Button 
              disabled={!user}
              onClick={() => router.push("/publish")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Post
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-card border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Featured Posts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">
                {selectedSportName ? `${selectedSportName} Posts` : "Featured Posts"}
              </h2>
              {selectedSportName && (
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  <span>{SPORT_CATEGORIES.find(s => s.id === selectedSport)?.icon}</span>
                  <span>{selectedSportName}</span>
                  <button
                    onClick={() => setSelectedSport("")}
                    className="ml-1 text-primary/70 hover:text-primary transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          
          <div className="space-y-6">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card border rounded-lg p-6 animate-pulse">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-300 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                </div>
              ))
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Error Loading Posts
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {error}
                </p>
                <Button onClick={loadPosts}>
                  Try Again
                </Button>
              </div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <PostCard key={`${post.author}/${post.permlink}`} post={post as unknown as Post} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">
                  {selectedSport ? SPORT_CATEGORIES.find(s => s.id === selectedSport)?.icon : "🏆"}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedSportName ? `No ${selectedSportName} posts yet` : "No posts available"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {selectedSportName 
                    ? `Be the first to share something about ${selectedSportName}!`
                    : "Check back later for new content."
                  }
                </p>
                <Button onClick={() => router.push("/publish")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Load More */}
        <div className="text-center">
          <Button variant="outline" size="lg">
            Load More Posts
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}

