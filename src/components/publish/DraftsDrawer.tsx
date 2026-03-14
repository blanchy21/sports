'use client';

import React from 'react';
import { X, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { Button } from '@/components/core/Button';

interface Draft {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  sport?: string;
  tags?: string[];
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  wordCount?: number;
}

interface DraftsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (draft: Draft) => void;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function DraftsDrawer({ isOpen, onClose, onRestore }: DraftsDrawerProps) {
  const [drafts, setDrafts] = React.useState<Draft[]>([]);

  React.useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem('drafts');
      if (saved) {
        const parsed: Draft[] = JSON.parse(saved);
        // Sort by updatedAt descending
        parsed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setDrafts(parsed);
      }
    } catch {
      setDrafts([]);
    }
  }, [isOpen]);

  const handleDelete = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = drafts.filter((d) => d.id !== draftId);
    setDrafts(updated);
    localStorage.setItem('drafts', JSON.stringify(updated));
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 transition-opacity" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-80 border-r bg-card shadow-xl',
          'transform transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Drafts</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Draft list */}
        <div
          className="flex-1 space-y-2 overflow-auto p-3"
          style={{ maxHeight: 'calc(100vh - 52px)' }}
        >
          {drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No drafts yet</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Save a draft while writing to see it here
              </p>
            </div>
          ) : (
            drafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => {
                  onRestore(draft);
                  onClose();
                }}
                className={cn(
                  'group w-full rounded-lg border p-3 text-left',
                  'transition-colors hover:bg-muted/50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{draft.title || 'Untitled'}</p>
                    {draft.content && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {draft.content.slice(0, 120)}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/70">
                        {formatTimeAgo(draft.updatedAt)}
                      </span>
                      {draft.sport && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          {draft.sport}
                        </span>
                      )}
                      {draft.wordCount != null && draft.wordCount > 0 && (
                        <span className="text-[10px] text-muted-foreground/70">
                          {draft.wordCount} words
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(draft.id, e)}
                    className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                    title="Delete draft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
