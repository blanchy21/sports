"use client";

import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
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
  AlertCircle
} from "lucide-react";

export default function DashboardPage() {
  const { user, authType, refreshHiveAccount } = useAuth();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

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
      title: "Total Comments",
      value: user.hiveStats?.commentCount?.toString() || "0",
      icon: MessageCircle,
      change: "From Hive blockchain",
      changeType: "neutral",
    },
    {
      title: "Total Votes",
      value: user.hiveStats?.voteCount?.toString() || "0",
      icon: Heart,
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

  // Recent posts - placeholder for now (would need posts API implementation)
  const recentPosts = user.hiveStats?.postCount && user.hiveStats.postCount > 0 ? [
    {
      id: "placeholder",
      title: "Your Hive posts will appear here",
      views: 0,
      upvotes: 0,
      comments: 0,
      publishedAt: "Coming soon",
    },
  ] : [
    {
      id: "no-posts",
      title: "No posts yet - start creating content!",
      views: 0,
      upvotes: 0,
      comments: 0,
      publishedAt: "Create your first post",
    },
  ];

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
                  <Award className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-600 font-medium">Hive Authenticated</span>
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
                      stat.changeType === "positive" ? "text-green-600" : 
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
          <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg p-6">
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
                  <div key={index} className="bg-white dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">{stat.title}</p>
                        <p className="text-xl font-bold text-orange-900 dark:text-orange-100">{stat.value}</p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">{stat.change}</p>
                      </div>
                      <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                        <Icon className="h-5 w-5 text-orange-600 dark:text-orange-300" />
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
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Recent Posts</h3>
            </div>
            <div className="space-y-4">
              {recentPosts.map((post, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium line-clamp-1">{post.title}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{post.views}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Heart className="h-3 w-3" />
                        <span>{post.upvotes}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{post.comments}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground ml-4">
                    {post.publishedAt}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Posts
            </Button>
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
