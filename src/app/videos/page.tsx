"use client";

import React from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { Video, Play, Eye, Clock } from "lucide-react";

// Mock video data
const mockVideos = [
  {
    id: "1",
    title: "Basketball Training: Perfect Your Jump Shot",
    description: "Learn the fundamentals of shooting with NBA shooting coach Mike Johnson.",
    thumbnail: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=225&fit=crop",
    duration: "8:32",
    views: "12.4K",
    author: "Basketball Academy",
    sport: "Basketball",
    publishedAt: "2 days ago",
  },
  {
    id: "2",
    title: "Soccer Tactics: The Art of the Through Ball",
    description: "Master the technique of delivering perfect through balls in soccer.",
    thumbnail: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=225&fit=crop",
    duration: "6:45",
    views: "8.7K",
    author: "Soccer Skills Pro",
    sport: "Soccer",
    publishedAt: "3 days ago",
  },
  {
    id: "3",
    title: "Tennis Serve: Power and Accuracy",
    description: "Professional tennis coach breaks down the perfect serve technique.",
    thumbnail: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=225&fit=crop",
    duration: "10:15",
    views: "15.2K",
    author: "Tennis Mastery",
    sport: "Tennis",
    publishedAt: "5 days ago",
  },
  {
    id: "4",
    title: "Baseball Pitching: The Slider Grip",
    description: "Learn how to throw an effective slider with proper grip and mechanics.",
    thumbnail: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=225&fit=crop",
    duration: "7:28",
    views: "9.1K",
    author: "Pitching Coach Pro",
    sport: "Baseball",
    publishedAt: "1 week ago",
  },
];

export default function VideosPage() {
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Video className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Sports Videos</h1>
        </div>

        {/* Featured Video */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="aspect-video relative">
            <Image
              src={mockVideos[0].thumbnail}
              alt={mockVideos[0].title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Button size="lg" className="rounded-full w-16 h-16">
                <Play className="h-6 w-6 ml-1" />
              </Button>
            </div>
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
              {mockVideos[0].duration}
            </div>
          </div>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-2">{mockVideos[0].title}</h2>
            <p className="text-muted-foreground mb-3">{mockVideos[0].description}</p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{mockVideos[0].author}</span>
              <span>•</span>
              <span>{mockVideos[0].views} views</span>
              <span>•</span>
              <span>{mockVideos[0].publishedAt}</span>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockVideos.slice(1).map((video) => (
            <div key={video.id} className="bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video relative">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Button size="sm" className="rounded-full w-12 h-12">
                    <Play className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {video.duration}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2">{video.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {video.description}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{video.author}</span>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>{video.views}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{video.publishedAt}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center">
          <Button variant="outline" size="lg">
            Load More Videos
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
