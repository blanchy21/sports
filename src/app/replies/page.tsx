"use client";

import React from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { MessageSquare, Reply, ThumbsUp } from "lucide-react";

const mockReplies = [
  {
    id: 1,
    postTitle: "The Evolution of Basketball: From Naismith to the Modern NBA",
    replier: {
      username: "hoops_fan_2024",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    },
    content: "Great analysis! I especially loved the section on how the three-point line changed the game.",
    timestamp: "2 hours ago",
    upvotes: 12,
  },
  {
    id: 2,
    postTitle: "Soccer Tactics: The Rise of the False 9 Position",
    replier: {
      username: "tactical_genius",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    },
    content: "This is exactly what I've been trying to explain to my team! The false 9 creates so much space.",
    timestamp: "5 hours ago",
    upvotes: 8,
  },
];

export default function RepliesPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <span>Replies</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Your conversations and interactions
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{mockReplies.length}</div>
                <div className="text-sm text-muted-foreground">New Replies</div>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Reply className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">24</div>
                <div className="text-sm text-muted-foreground">Total Conversations</div>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ThumbsUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">156</div>
                <div className="text-sm text-muted-foreground">Reply Upvotes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Replies List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Replies</h2>
          
          {mockReplies.map((reply) => (
            <div key={reply.id} className="bg-card border rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                <Image
                  src={reply.replier.avatar}
                  alt={reply.replier.username}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium">@{reply.replier.username}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{reply.timestamp}</span>
                  </div>
                  
                  <div className="mb-2">
                    <span className="text-sm text-muted-foreground">Replied to: </span>
                    <span className="text-sm font-medium">{reply.postTitle}</span>
                  </div>
                  
                  <p className="text-foreground mb-3">{reply.content}</p>
                  
                  <div className="flex items-center space-x-4">
                    <button className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{reply.upvotes}</span>
                    </button>
                    
                    <button className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <Reply className="h-4 w-4" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State (when no replies) */}
        {mockReplies.length === 0 && (
          <div className="bg-card border rounded-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-muted rounded-full">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">No replies yet</h2>
            <p className="text-muted-foreground">
              When people reply to your posts, they&apos;ll appear here
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

