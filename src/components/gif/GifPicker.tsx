'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils/client';

export interface GiphyGif {
  id: string;
  title: string;
  images: {
    original: { url: string; width: string; height: string };
    fixed_height: { url: string; width: string; height: string };
    fixed_height_small: { url: string; width: string; height: string };
    fixed_width: { url: string; width: string; height: string };
    preview_gif: { url: string; width: string; height: string };
  };
}

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
  className?: string;
}

export function GifPicker({ isOpen, onClose, onSelect, className }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load trending GIFs when picker opens
  const loadTrendingGifs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/giphy?type=trending&limit=24');

      if (!response.ok) {
        throw new Error('Failed to load trending GIFs');
      }

      const data = await response.json();
      if (data.success) {
        setGifs(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to load trending GIFs');
      }
    } catch (err) {
      console.error('Trending GIF error:', err);
      setError('Failed to load GIFs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search GIFs
  const searchGifs = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        loadTrendingGifs();
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/giphy?type=search&q=${encodeURIComponent(query)}&limit=24`
        );

        if (!response.ok) {
          throw new Error('Failed to search GIFs');
        }

        const data = await response.json();
        if (data.success) {
          setGifs(data.data || []);
        } else {
          throw new Error(data.error || 'Failed to search GIFs');
        }
      } catch (err) {
        console.error('GIF search error:', err);
        setError('Failed to search GIFs. Please try again.');
        setGifs([]);
      } finally {
        setIsLoading(false);
      }
    },
    [loadTrendingGifs]
  );

  // Handle search input with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchGifs(value);
    }, 300);
  };

  // Handle GIF selection
  const handleSelect = (gif: GiphyGif) => {
    // Use fixed_height for a good balance of quality and size
    const gifUrl = gif.images.fixed_height?.url || gif.images.original?.url;
    if (gifUrl) {
      onSelect(gifUrl);
      onClose();
      setSearchQuery('');
    }
  };

  // Load trending when opened
  useEffect(() => {
    if (isOpen) {
      loadTrendingGifs();
    }
  }, [isOpen, loadTrendingGifs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute z-50 max-h-96 w-80 overflow-hidden rounded-lg border bg-card shadow-lg',
        className
      )}
    >
      {/* Search input */}
      <div className="border-b p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search GIFs..."
            className="w-full rounded-md bg-muted py-2 pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                loadTrendingGifs();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* GIF results */}
      <div className="max-h-72 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {error}
            <button
              type="button"
              onClick={loadTrendingGifs}
              className="mt-2 block w-full text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : gifs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {searchQuery ? 'No GIFs found' : 'Search for GIFs'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => handleSelect(gif)}
                className="relative aspect-square overflow-hidden rounded transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gif.images.fixed_height_small?.url || gif.images.preview_gif?.url}
                  alt={gif.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Giphy attribution */}
      <div className="border-t bg-muted/50 px-2 py-1.5 text-center">
        <a
          href="https://giphy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          Powered by GIPHY
        </a>
      </div>
    </div>
  );
}
