"use client";

import React from "react";
import Image from "next/image";
import { TrendingUp, Users, Calendar, Trophy, Star } from "lucide-react";
import { SPORT_CATEGORIES } from "@/types";

const trendingTopics = [
  { id: 1, name: "NBA Finals", posts: 2453 },
  { id: 2, name: "World Cup 2024", posts: 1892 },
  { id: 3, name: "Champions League", posts: 1567 },
  { id: 4, name: "Super Bowl LVIII", posts: 1234 },
  { id: 5, name: "Tennis Grand Slam", posts: 987 },
];

const trendingSports = [
  { sport: SPORT_CATEGORIES.find(s => s.id === "american-football") || SPORT_CATEGORIES[0], posts: 124, trending: true },
  { sport: SPORT_CATEGORIES.find(s => s.id === "basketball") || SPORT_CATEGORIES[0], posts: 98, trending: true },
  { sport: SPORT_CATEGORIES.find(s => s.id === "football") || SPORT_CATEGORIES[0], posts: 156, trending: false },
  { sport: SPORT_CATEGORIES.find(s => s.id === "tennis") || SPORT_CATEGORIES[0], posts: 67, trending: true },
  { sport: SPORT_CATEGORIES.find(s => s.id === "mma") || SPORT_CATEGORIES[0], posts: 89, trending: false },
];

const topAuthors = [
  {
    id: 1,
    username: "sports_analyst",
    displayName: "Alex Morgan",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=100&h=100&fit=crop&crop=face",
    posts: 342,
    followers: "12.5K",
  },
  {
    id: 2,
    username: "basketball_guru",
    displayName: "Jordan Smith",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    posts: 289,
    followers: "10.2K",
  },
  {
    id: 3,
    username: "soccer_insider",
    displayName: "Emma Wilson",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    posts: 256,
    followers: "9.8K",
  },
];

const upcomingEvents = [
  { id: 1, name: "NBA Playoffs", date: "April 15, 2024", icon: "🏀" },
  { id: 2, name: "Champions League Final", date: "May 28, 2024", icon: "⚽" },
  { id: 3, name: "Wimbledon", date: "July 1, 2024", icon: "🎾" },
];

export const RightSidebar: React.FC = () => {
  return (
    <aside className="hidden xl:flex xl:flex-col xl:w-[28rem] xl:fixed xl:right-0 xl:top-20 xl:h-[calc(100vh-5rem)] xl:overflow-y-auto xl:border-l bg-background xl:p-6">
      <div className="space-y-6">
        {/* Trending Topics */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Trending Topics</h3>
          </div>
          <div className="space-y-3">
            {trendingTopics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-medium text-sm">#{topic.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {topic.posts.toLocaleString()} posts
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 text-sm text-primary hover:underline">
            Show more
          </button>
        </div>

        {/* Trending Sports */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Star className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Trending Sports</h3>
          </div>
          <div className="space-y-3">
            {trendingSports.map((item) => (
              <div key={item.sport.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{item.sport.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{item.sport.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.posts} posts
                    </div>
                  </div>
                </div>
                {item.trending && (
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500">Hot</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Top Authors */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Top Authors</h3>
          </div>
          <div className="space-y-3">
            {topAuthors.map((author) => (
              <div
                key={author.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
              >
                <Image
                  src={author.avatar}
                  alt={author.displayName}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {author.displayName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{author.username}
                  </div>
                </div>
                <button className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                  Follow
                </button>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 text-sm text-primary hover:underline">
            View all authors
          </button>
        </div>

        {/* Upcoming Events */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Upcoming Events</h3>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="text-2xl">{event.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{event.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {event.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-primary via-teal-500 to-cyan-500 rounded-lg p-4 text-white">
          <div className="flex items-center space-x-2 mb-3">
            <Trophy className="h-5 w-5" />
            <h3 className="font-semibold text-base">Community Stats</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm opacity-90">Total Posts</span>
              <span className="font-bold">12,543</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-90">Active Authors</span>
              <span className="font-bold">2,341</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-90">Total Rewards</span>
              <span className="font-bold">$45,678</span>
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold text-base mb-2">Stay Updated</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Get the latest sports news and updates delivered to your inbox
          </p>
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Your email"
              className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

