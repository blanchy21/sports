"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useUserPosts } from "@/hooks/useUserPosts";
import { getProxyImageUrl, shouldProxyImage } from "@/lib/utils/image-proxy";
import { 
  Eye, 
  Heart, 
  MessageCircle,
  DollarSign,
  Calendar,
  Award,
  BarChart3,
  FileText,
  RefreshCw,
  AlertCircle,
  Loader2,
  ExternalLink,
  Users
} from "lucide-react";

export default function DashboardPage() {
  const { user, authType, refreshHiveAccount } = useAuth();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  // Fetch user's recent posts
  const { posts: recentPosts, isLoading: postsLoading, error: postsError, refetch: refetchPosts } = useUserPosts(
    user?.username || '', 
    5
  );

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  const handleRefreshData = async () => {
    if (authType !== "hive") return;
    
    setIsRefreshing(true);
    setRefreshError(null);
    
    try {
      await refreshHiveAccount();
      console.log("Dashboard data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
      setRefreshError("Failed to refresh data. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!user) {
    return (
      <MainLayout showRightSidebar={false} className="max-w-none">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Please sign in to view your dashboard</h2>
          <Button onClick={() => router.push("/")}>
            Go Home
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Real stats from Hive API data
  const stats: Array<{
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    change: string;
    changeType: "positive" | "negative" | "neutral";
  }> = [
    {
      title: "Total Posts",
      value: user.hiveStats?.postCount?.toString() || "0",
      icon: FileText,
      change: "From Hive blockchain",
      changeType: "neutral",
    },
    {
      title: "Reputation",
      value: user.reputationFormatted || "25.00",
      icon: Award,
      change: "From Hive blockchain",
      changeType: "neutral",
    },
    {
      title: "Total Following",
      value: user.hiveStats?.following?.toString() || "0",
      icon: Users,
      change: "From Hive blockchain",
      changeType: "neutral",
    },
    {
      title: "Followers",
      value: user.hiveStats?.followers?.toString() || "0",
      icon: Eye,
      change: "From Hive blockchain",
      changeType: "neutral",
    },
  ];

  const rewardsStats: Array<{
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    change: string;
    changeType: "positive" | "negative" | "neutral";
  }> = authType === "hive" ? [
    {
      title: "Liquid HIVE",
      value: `${user.liquidHiveBalance?.toFixed(3) || "0.000"} HIVE`,
      icon: DollarSign,
      change: "Liquid balance",
      changeType: "neutral",
    },
    {
      title: "Liquid HBD",
      value: `${user.liquidHbdBalance?.toFixed(3) || "0.000"} HBD`,
      icon: DollarSign,
      change: "Liquid balance",
      changeType: "neutral",
    },
    {
      title: "HIVE Power",
      value: `${user.hivePower?.toFixed(3) || "0.000"} HP`,
      icon: Award,
      change: "Staked HIVE",
      changeType: "neutral",
    },
    {
      title: "Resource Credits",
      value: `${user.rcPercentage?.toFixed(1) || "0.0"}%`,
      icon: BarChart3,
      change: "Available RC",
      changeType: "neutral",
    },
  ] : [];

  // Helper function to extract image from post body
  const extractImageFromPost = (body: string): string | null => {
    const imgRegex = /!\[.*?\]\((.*?)\)/;
    const match = body.match(imgRegex);
    return match ? match[1] : null;
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <MainLayout showRightSidebar={false} className="max-w-none">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar
              src={user.avatar}
              fallback={user.username}
              alt={user.displayName || user.username}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-bold">{user.displayName || user.username}</h1>
              <p className="text-muted-foreground">@{user.username}</p>
              {authType === "hive" && (
                <div className="flex items-center space-x-1 mt-1">
                  <Award className="h-4 w-4 text-accent" />
                  <span className="text-sm text-accent font-medium">Hive Authenticated</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {authType === "hive" && (
              <Button
                variant="outline"
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            )}
            <Button onClick={() => router.push("/publish")}>
              Create Post
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {refreshError && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 dark:text-red-200">{refreshError}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-card border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className={`text-xs ${
                      stat.changeType === "positive" ? "text-accent" : 
                      stat.changeType === "negative" ? "text-red-600" : "text-muted-foreground"
                    }`}>
                      {stat.change}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>


        {/* Rewards Stats (Hive users only) */}
        {rewardsStats.length > 0 && (
          <div className="bg-gradient-to-r from-primary to-accent rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <DollarSign className="h-5 w-5 text-white" />
              <h3 className="text-lg font-semibold text-white">
                Hive Account Balances
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rewardsStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white font-medium">{stat.title}</p>
                        <p className="text-xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-white">{stat.change}</p>
                      </div>
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Posts */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Recent Posts</h3>
              </div>
              {authType === "hive" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refetchPosts}
                  disabled={postsLoading}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className={`h-3 w-3 ${postsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
              )}
            </div>
            
            {postsError && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800 dark:text-red-200">{postsError}</span>
              </div>
            )}

            <div className="space-y-3">
              {postsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading posts...</span>
                </div>
              ) : recentPosts.length > 0 ? (
                recentPosts.map((post, index) => {
                  const thumbnail = extractImageFromPost(post.body);
                  return (
                    <div 
                      key={post.id || `post-${index}`} 
                      className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/post/${post.author}/${post.permlink}`)}
                    >
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        {thumbnail ? (
                          <Image
                            src={shouldProxyImage(thumbnail) ? getProxyImageUrl(thumbnail) : thumbnail}
                            alt={post.title}
                            width={64}
                            height={64}
                            className="w-16 h-16 object-cover rounded-lg"
                            unoptimized={shouldProxyImage(thumbnail)}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium line-clamp-2 text-sm leading-tight">{post.title}</h4>
                        <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center space-x-1">
                            <Heart className="h-3 w-3" />
                            <span>{post.net_votes}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>{post.children}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3" />
                            <span>{parseFloat(post.pending_payout_value).toFixed(2)} HIVE</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(post.created)}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-medium text-muted-foreground mb-2">No posts yet</h4>
                  <p className="text-sm text-muted-foreground mb-4">Start creating content to see your posts here!</p>
                  <Button onClick={() => router.push("/publish")} size="sm">
                    Create Your First Post
                  </Button>
                </div>
              )}
            </div>
            
            {recentPosts.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => router.push(`/profile`)}
              >
                View All Posts
              </Button>
            )}
          </div>

          {/* Activity */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {[
                { action: "Account created", target: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown", time: "Account age" },
                { action: "Last post", target: user.hiveStats?.postCount ? `${user.hiveStats.postCount} posts` : "No posts yet", time: user.lastPost ? new Date(user.lastPost).toLocaleDateString() : "Never" },
                { action: "Last vote", target: user.hiveStats?.voteCount ? `${user.hiveStats.voteCount} total votes` : "No votes yet", time: user.lastVote ? new Date(user.lastVote).toLocaleDateString() : "Never" },
                { action: "Reputation", target: user.reputationFormatted || "25.00", time: "Current reputation" },
              ].map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.action}</span>
                      <span className="text-muted-foreground"> on </span>
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
