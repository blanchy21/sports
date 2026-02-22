'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check } from 'lucide-react';
import { SPORT_CATEGORIES } from '@/types';
import { cn } from '@/lib/utils/client';

export interface SportStats {
  [sportId: string]: { posts: number };
}

interface SportsFilterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSportSelect: (sportId: string) => void;
  selectedSport?: string;
  sportStats?: SportStats;
}

export const SportsFilterPopup: React.FC<SportsFilterPopupProps> = ({
  isOpen,
  onClose,
  onSportSelect,
  selectedSport,
}) => {
  const [search, setSearch] = useState('');

  // Reset search when popup opens
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const filteredSports = useMemo(() => {
    if (!search.trim()) return SPORT_CATEGORIES;
    const q = search.toLowerCase();
    return SPORT_CATEGORIES.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSportClick = (sportId: string) => {
    onSportSelect(sportId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Popup Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:max-h-[85vh]"
            >
              {/* Header */}
              <div className="relative flex-shrink-0 bg-gradient-to-r from-primary to-bright-cobalt px-5 py-4 sm:px-6 sm:py-5">
                <button
                  onClick={onClose}
                  className="absolute right-3 top-3 rounded-lg p-1.5 text-white/80 transition-all duration-200 hover:bg-white/20 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="text-lg font-bold text-white sm:text-xl">Choose Sport</h2>
                <p className="mt-0.5 text-sm text-white/70">Filter your feed by sport</p>
              </div>

              {/* Search */}
              <div className="flex-shrink-0 border-b border-border px-4 py-3 sm:px-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search sports..."
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>
              </div>

              {/* "All Sports" option */}
              <div className="flex-shrink-0 border-b border-border px-4 py-2 sm:px-5">
                <button
                  onClick={() => handleSportClick('')}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    !selectedSport ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-bright-cobalt text-lg">
                    🏆
                  </span>
                  <span className="flex-1 text-sm font-semibold">All Sports</span>
                  {!selectedSport && <Check className="h-4 w-4 text-primary" />}
                </button>
              </div>

              {/* Scrollable sports list */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="grid grid-cols-2 gap-1.5 p-4 sm:grid-cols-3 sm:p-5">
                  {filteredSports.map((sport) => {
                    const isSelected = selectedSport === sport.id;

                    return (
                      <button
                        key={sport.id}
                        onClick={() => handleSportClick(sport.id)}
                        className={cn(
                          'group relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-150',
                          'hover:shadow-md active:scale-[0.97]',
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-transparent bg-muted/50 hover:border-border hover:bg-muted'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-lg transition-transform duration-150',
                            sport.color,
                            !isSelected && 'group-hover:scale-110'
                          )}
                        >
                          {sport.icon}
                        </span>

                        <span
                          className={cn(
                            'flex-1 truncate text-sm font-medium',
                            isSelected ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {sport.name}
                        </span>

                        {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>

                {filteredSports.length === 0 && (
                  <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No sports match &ldquo;{search}&rdquo;
                  </div>
                )}
              </div>

              {/* Footer */}
              {selectedSport && (
                <div className="flex-shrink-0 border-t border-border px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Filtering by{' '}
                      <span className="font-semibold text-primary">
                        {SPORT_CATEGORIES.find((s) => s.id === selectedSport)?.name}
                      </span>
                    </span>
                    <button
                      onClick={() => handleSportClick('')}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Clear filter
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
