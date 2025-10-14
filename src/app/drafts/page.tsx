"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FileEdit, Edit, Trash2, Calendar, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock draft posts
const mockDrafts = [
  {
    id: "1",
    title: "Football Strategy: The Evolution of the Spread Offense",
    content: "The spread offense has revolutionized modern football...",
    excerpt: "Explore how the spread offense has changed the game and why it's become the dominant offensive scheme.",
    sport: "Football",
    tags: ["football", "strategy", "spread-offense"],
    updatedAt: "2 days ago",
    wordCount: 1247,
  },
  {
    id: "2",
    title: "Tennis Serve: Mastering the Kick Serve",
    content: "The kick serve is one of the most effective weapons...",
    excerpt: "Learn the technique and timing needed to master the kick serve in tennis.",
    sport: "Tennis",
    tags: ["tennis", "serve", "technique"],
    updatedAt: "5 days ago",
    wordCount: 892,
  },
  {
    id: "3",
    title: "Golf Course Management: Playing Smart",
    content: "Course management is often overlooked by amateur golfers...",
    excerpt: "Discover the strategic thinking that separates good golfers from great ones.",
    sport: "Golf",
    tags: ["golf", "strategy", "course-management"],
    updatedAt: "1 week ago",
    wordCount: 1563,
  },
];

export default function DraftsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to view your draft posts.
          </p>
          <Button onClick={() => router.push("/")}>
            Go Home
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileEdit className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Drafts</h1>
            <span className="text-sm text-muted-foreground">
              ({mockDrafts.length} saved)
            </span>
          </div>
          
          <Button onClick={() => router.push("/publish")}>
            <Edit className="h-4 w-4 mr-2" />
            Create New Draft
          </Button>
        </div>

        {/* Drafts List */}
        {mockDrafts.length > 0 ? (
          <div className="space-y-4">
            {mockDrafts.map((draft) => (
              <div key={draft.id} className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{draft.title}</h3>
                    <p className="text-muted-foreground mb-3 line-clamp-2">
                      {draft.excerpt}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Updated {draft.updatedAt}</span>
                      </div>
                      <span>•</span>
                      <span>{draft.sport}</span>
                      <span>•</span>
                      <span>{draft.wordCount} words</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {draft.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/publish?draft=${draft.id}`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileEdit className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No drafts yet</h3>
            <p className="text-muted-foreground mb-4">
              Start writing your first post and save it as a draft.
            </p>
            <Button onClick={() => router.push("/publish")}>
              Create Your First Draft
            </Button>
          </div>
        )}

        {/* Load More */}
        {mockDrafts.length > 0 && (
          <div className="text-center">
            <Button variant="outline" size="lg">
              Load More Drafts
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
