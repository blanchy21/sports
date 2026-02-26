import { useState, useEffect, useCallback, useMemo } from 'react';

export type FilterCategory = 'replies' | 'mentions' | 'votes' | 'follows' | 'tips' | 'other';

export const FILTER_CATEGORIES: {
  key: FilterCategory;
  label: string;
  types: string[];
}[] = [
  { key: 'replies', label: 'Replies', types: ['comment', 'short_reply', 'reply'] },
  { key: 'mentions', label: 'Mentions', types: ['mention'] },
  { key: 'votes', label: 'Votes', types: ['vote', 'like'] },
  { key: 'follows', label: 'Follows', types: ['follow'] },
  { key: 'tips', label: 'Tips', types: ['tip'] },
  { key: 'other', label: 'Other', types: ['system', 'post', 'transfer', 'reblog'] },
];

const STORAGE_KEY_PREFIX = 'sportsblock-notification-filters';

type FilterState = Record<FilterCategory, boolean>;

const DEFAULT_FILTERS: FilterState = {
  replies: true,
  mentions: true,
  votes: true,
  follows: true,
  tips: true,
  other: true,
};

function getStorageKey(username?: string | null): string {
  return `${STORAGE_KEY_PREFIX}:${username?.toLowerCase() || 'guest'}`;
}

export function useNotificationFilter(username?: string | null) {
  const storageKey = useMemo(() => getStorageKey(username), [username]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setFilters({ ...DEFAULT_FILTERS, ...JSON.parse(saved) });
      } else {
        setFilters(DEFAULT_FILTERS);
      }
    } catch {
      setFilters(DEFAULT_FILTERS);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch {
      // localStorage full or unavailable — ignore
    }
  }, [filters, storageKey]);

  const toggleFilter = useCallback((category: FilterCategory) => {
    setFilters((prev) => ({ ...prev, [category]: !prev[category] }));
  }, []);

  const enabledTypes = useMemo(() => {
    const types = new Set<string>();
    for (const cat of FILTER_CATEGORIES) {
      if (filters[cat.key]) {
        for (const t of cat.types) types.add(t);
      }
    }
    return types;
  }, [filters]);

  const isVisible = useCallback((type: string) => enabledTypes.has(type), [enabledTypes]);

  return { filters, toggleFilter, isVisible };
}
