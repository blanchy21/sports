"use client";

import React from "react";
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
  FileText
} from "lucide-react";

export default function DashboardPage() {
  const { user, authType } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

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

  // Mock stats
  const stats = [
    {
      title: "Total Posts",
      value: "12",
      icon: FileText,
      change: "+2 this week",
      changeType: "positive" as const,
    },
    {
      title: "Total Views",
      value: "2.3K",
      icon: Eye,
      change: "+156 this week",
      changeType: "positive" as const,
    },
    {
      title: "Total Upvotes",
      value: "89",
      icon: Heart,
      change: "+12 this week",
      changeType: "positive" as const,
    },
    {
      title: "Comments",
      value: "34",
      icon: MessageCircle,
      change: "+5 this week",
      changeType: "positive" as const,
    },
  ];

  const rewardsStats = authType === "hive" ? [
    {
      title: "Hive Rewards",
      value: "45.67 HIVE",
      icon: DollarSign,
      change: "+12.34 this week",
      changeType: "positive" as const,
    },
    {
      title: "HBD Rewards",
      value: "23.45 HBD",
      icon: DollarSign,
      change: "+8.21 this week",
      changeType: "positive" as const,
    },
  ] : [];

  const recentPosts = [
    {
      id: "1",
      title: "Basketball Training Fundamentals",
      views: 456,
      upvotes: 23,
      comments: 8,
      publishedAt: "2 days ago",
    },
    {
      id: "2",
      title: "Soccer Tactics Analysis",
      views: 789,
      upvotes: 45,
      comments: 12,
      publishedAt: "5 days ago",
    },
    {
      id: "3",
      title: "Tennis Mental Game",
      views: 234,
      upvotes: 18,
      comments: 5,
      publishedAt: "1 week ago",
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
                  <Award className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Hive Authenticated</span>
                </div>
              )}
            </div>
          </div>
          <Button onClick={() => router.push("/publish")}>
            Create Post
          </Button>
        </div>

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
                      stat.changeType === "positive" ? "text-green-600" : "text-red-600"
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
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                Blockchain Rewards
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewardsStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="bg-white dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-300">{stat.title}</p>
                        <p className="text-xl font-bold text-green-800 dark:text-green-200">{stat.value}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">{stat.change}</p>
                      </div>
                      <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                        <Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
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
                { action: "Post published", target: "Basketball Training Fundamentals", time: "2 days ago" },
                { action: "Received upvote", target: "Soccer Tactics Analysis", time: "3 days ago" },
                { action: "New comment", target: "Tennis Mental Game", time: "4 days ago" },
                { action: "Post published", target: "Baseball Analytics Guide", time: "1 week ago" },
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
