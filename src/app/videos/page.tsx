'use client';

import React from 'react';
import Image from 'next/image';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/core/Button';
import { Video, Play, Eye, Clock } from 'lucide-react';

// Mock video data
const mockVideos = [
  {
    id: '1',
    title: 'Basketball Training: Perfect Your Jump Shot',
    description: 'Learn the fundamentals of shooting with NBA shooting coach Mike Johnson.',
    thumbnail: '/stadium.jpg',
    duration: '8:32',
    views: '12.4K',
    author: 'Basketball Academy',
    sport: 'Basketball',
    publishedAt: '2 days ago',
  },
  {
    id: '2',
    title: 'Soccer Tactics: The Art of the Through Ball',
    description: 'Master the technique of delivering perfect through balls in soccer.',
    thumbnail: '/stadium.jpg',
    duration: '6:45',
    views: '8.7K',
    author: 'Soccer Skills Pro',
    sport: 'Soccer',
    publishedAt: '3 days ago',
  },
  {
    id: '3',
    title: 'Tennis Serve: Power and Accuracy',
    description: 'Professional tennis coach breaks down the perfect serve technique.',
    thumbnail: '/stadium.jpg',
    duration: '10:15',
    views: '15.2K',
    author: 'Tennis Mastery',
    sport: 'Tennis',
    publishedAt: '5 days ago',
  },
  {
    id: '4',
    title: 'Baseball Pitching: The Slider Grip',
    description: 'Learn how to throw an effective slider with proper grip and mechanics.',
    thumbnail: '/stadium.jpg',
    duration: '7:28',
    views: '9.1K',
    author: 'Pitching Coach Pro',
    sport: 'Baseball',
    publishedAt: '1 week ago',
  },
];

export default function VideosPage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Video className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Sports Videos</h1>
        </div>

        {/* Featured Video */}
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="relative aspect-video">
            <Image
              src={mockVideos[0].thumbnail}
              alt={mockVideos[0].title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Button size="lg" className="h-16 w-16 rounded-full">
                <Play className="ml-1 h-6 w-6" />
              </Button>
            </div>
            <div className="absolute bottom-4 left-4 rounded bg-black/70 px-2 py-1 text-sm text-white">
              {mockVideos[0].duration}
            </div>
          </div>
          <div className="p-6">
            <h2 className="mb-2 text-xl font-semibold">{mockVideos[0].title}</h2>
            <p className="mb-3 text-muted-foreground">{mockVideos[0].description}</p>
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockVideos.slice(1).map((video) => (
            <div
              key={video.id}
              className="overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-video">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                  <Button size="sm" className="h-12 w-12 rounded-full">
                    <Play className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                  {video.duration}
                </div>
              </div>
              <div className="p-4">
                <h3 className="mb-2 line-clamp-2 font-semibold">{video.title}</h3>
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
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
