"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FileEdit, Edit, Trash2, Calendar, AlertCircle, Loader2 } from "lucide-react";

interface Draft {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  sport: string;
  tags: string[];
  updatedAt: string;
  wordCount: number;
}

export default function DraftsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  // Load drafts from localStorage (in a real app, this would be from a database)
  const loadDrafts = async () => {
    setIsLoading(true);
    setError(null);
    
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    try {
      // In a real app, this would be an API call
      const savedDrafts = localStorage.getItem('drafts');
      if (savedDrafts) {
        const parsedDrafts = JSON.parse(savedDrafts);
        // Ensure all drafts have required fields and unique IDs
        const validDrafts = parsedDrafts.map((draft: Record<string, unknown>, index: number) => ({
          id: (draft.id as string) || `draft-${Date.now()}-${index}`,
          title: (draft.title as string) || 'Untitled Draft',
          content: (draft.content as string) || '',
          excerpt: (draft.excerpt as string) || ((draft.content as string) ? (draft.content as string).substring(0, 150) + ((draft.content as string).length > 150 ? '...' : '') : ''),
          sport: (draft.sport as string) || '',
          tags: Array.isArray(draft.tags) ? draft.tags as string[] : ((draft.tags as string) ? (draft.tags as string).split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0) : []),
          updatedAt: (draft.updatedAt as string) || (draft.createdAt as string) || new Date().toISOString(),
          wordCount: (draft.wordCount as number) || ((draft.content as string) ? (draft.content as string).split(/\s+/).filter((word: string) => word.length > 0).length : 0),
        }));
        
        // Update localStorage with the corrected drafts (in case some were missing IDs)
        const needsUpdate = parsedDrafts.some((draft: Record<string, unknown>) => !draft.id);
        if (needsUpdate) {
          try {
            localStorage.setItem('drafts', JSON.stringify(validDrafts));
          } catch {
            // Storage update failed silently - drafts still in memory
          }
        }
        
        setDrafts(validDrafts);
      } else {
        setDrafts([]);
      }
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError('Failed to load drafts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a draft
  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }

    setDeletingDraftId(draftId);
    
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      const savedDrafts = localStorage.getItem('drafts');
      if (savedDrafts) {
        const parsedDrafts = JSON.parse(savedDrafts);
        const updatedDrafts = parsedDrafts.filter((draft: Record<string, unknown>) => draft.id !== draftId);
        try {
          localStorage.setItem('drafts', JSON.stringify(updatedDrafts));
        } catch (error) {
          console.error('Error saving drafts:', error);
          throw error;
        }
        setDrafts(updatedDrafts);
      }
    } catch (err) {
      console.error('Error deleting draft:', err);
      setError('Failed to delete draft. Please try again.');
    } finally {
      setDeletingDraftId(null);
    }
  };

  // Redirect if not authenticated (wait for auth to load first)
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/");
    } else if (!isAuthLoading && user) {
      loadDrafts();
    }
  }, [user, isAuthLoading, router]);

  // Show loading or auth required message
  if (isAuthLoading || !user) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {isAuthLoading ? "Loading..." : "Authentication Required"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {isAuthLoading ? "Checking authentication..." : "Please sign in to view your draft posts."}
          </p>
          {!isAuthLoading && (
            <Button onClick={() => router.push("/")}>
              Go Home
            </Button>
          )}
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
              ({drafts.length} saved)
            </span>
          </div>
          
          <Button onClick={() => router.push("/publish")}>
            <Edit className="h-4 w-4 mr-2" />
            Create New Draft
          </Button>
        </div>

        {/* Drafts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading drafts...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={loadDrafts}>Try Again</Button>
          </div>
        ) : drafts.length > 0 ? (
          <div className="space-y-4">
            {drafts.map((draft) => (
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
                      {Array.isArray(draft.tags) && draft.tags.map((tag) => (
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
                      onClick={() => handleDeleteDraft(draft.id)}
                      disabled={deletingDraftId === draft.id}
                    >
                      {deletingDraftId === draft.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
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
        {drafts.length > 0 && (
          <div className="text-center">
            <Button variant="outline" size="lg" onClick={loadDrafts}>
              Refresh Drafts
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
