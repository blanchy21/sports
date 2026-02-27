'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FileEdit, Edit, Trash2, Calendar, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

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

export function DraftsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  const loadDrafts = async () => {
    setIsLoading(true);
    setError(null);

    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const savedDrafts = localStorage.getItem('drafts');
      if (savedDrafts) {
        const parsedDrafts = JSON.parse(savedDrafts);
        const validDrafts = parsedDrafts.map((draft: Record<string, unknown>, index: number) => ({
          id: (draft.id as string) || `draft-${Date.now()}-${index}`,
          title: (draft.title as string) || 'Untitled Draft',
          content: (draft.content as string) || '',
          excerpt:
            (draft.excerpt as string) ||
            ((draft.content as string)
              ? (draft.content as string).substring(0, 150) +
                ((draft.content as string).length > 150 ? '...' : '')
              : ''),
          sport: (draft.sport as string) || '',
          tags: Array.isArray(draft.tags)
            ? (draft.tags as string[])
            : (draft.tags as string)
              ? (draft.tags as string)
                  .split(',')
                  .map((t: string) => t.trim())
                  .filter((t: string) => t.length > 0)
              : [],
          updatedAt:
            (draft.updatedAt as string) || (draft.createdAt as string) || new Date().toISOString(),
          wordCount:
            (draft.wordCount as number) ||
            ((draft.content as string)
              ? (draft.content as string).split(/\s+/).filter((word: string) => word.length > 0)
                  .length
              : 0),
        }));

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
      logger.error('Error loading drafts', 'DraftsContent', err);
      setError('Failed to load drafts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
        const updatedDrafts = parsedDrafts.filter(
          (draft: Record<string, unknown>) => draft.id !== draftId
        );
        try {
          localStorage.setItem('drafts', JSON.stringify(updatedDrafts));
        } catch (error) {
          logger.error('Error saving drafts', 'DraftsContent', error);
          throw error;
        }
        setDrafts(updatedDrafts);
      }
    } catch (err) {
      logger.error('Error deleting draft', 'DraftsContent', err);
      setError('Failed to delete draft. Please try again.');
    } finally {
      setDeletingDraftId(null);
    }
  };

  useEffect(() => {
    if (user) {
      loadDrafts();
    }
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileEdit className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Drafts</h2>
          <span className="text-sm text-muted-foreground">({drafts.length} saved)</span>
        </div>

        <Button onClick={() => router.push('/publish')}>
          <Edit className="mr-2 h-4 w-4" />
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
        <div className="py-12 text-center">
          <p className="mb-4 text-destructive">{error}</p>
          <Button onClick={loadDrafts}>Try Again</Button>
        </div>
      ) : drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-semibold">{draft.title}</h3>
                  <p className="mb-3 line-clamp-2 text-muted-foreground">{draft.excerpt}</p>

                  <div className="mb-4 flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Updated {draft.updatedAt}</span>
                    </div>
                    <span>&bull;</span>
                    <span>{draft.sport}</span>
                    <span>&bull;</span>
                    <span>{draft.wordCount} words</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(draft.tags) &&
                      draft.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="ml-4 flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/publish?draft=${draft.id}`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive/80"
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
        <div className="py-12 text-center">
          <FileEdit className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No drafts yet</h3>
          <p className="mb-4 text-muted-foreground">
            Start writing your first post and save it as a draft.
          </p>
          <Button onClick={() => router.push('/publish')}>Create Your First Draft</Button>
        </div>
      )}

      {/* Refresh */}
      {drafts.length > 0 && (
        <div className="text-center">
          <Button variant="outline" size="lg" onClick={loadDrafts}>
            Refresh Drafts
          </Button>
        </div>
      )}
    </div>
  );
}
