'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Clock } from 'lucide-react';
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
  sportStats = {},
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

          {/* Popup Container - using flexbox for centering to avoid Framer Motion transform conflicts */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pr-[100px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-hidden sm:max-h-[90vh]"
            >
              <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-2xl dark:bg-card">
                {/* Header */}
                <div className="relative flex-shrink-0 bg-gradient-to-r from-primary to-bright-cobalt px-4 py-4 sm:px-8 sm:py-6">
                  <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-lg p-2 text-white/80 transition-all duration-200 hover:bg-white/20 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="pr-10">
                    <h2 className="mb-1 text-xl font-bold text-white sm:mb-2 sm:text-2xl">
                      Choose Your Sports
                    </h2>
                    <p className="text-sm text-white/80 sm:text-base">
                      Filter your feed to see only the sports you care about
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                      {SPORT_CATEGORIES.map((sport) => {
                        const stats = sportStats[sport.id];
                        const isSelected = selectedSport === sport.id;

                        return (
                          <motion.button
                            key={sport.id}
                            onClick={() => handleSportClick(sport.id)}
                            className={cn(
                              'group relative rounded-xl border-2 p-3 text-left transition-all duration-200 sm:p-6',
                              'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
                              isSelected
                                ? 'border-primary bg-primary/5 shadow-md'
                                : 'border-border bg-card hover:border-primary/50'
                            )}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {/* Sport Icon */}
                            <div className="mb-2 flex items-start gap-3 sm:mb-4 sm:gap-4">
                              <div
                                className={cn(
                                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xl transition-all duration-200 sm:h-16 sm:w-16 sm:rounded-xl sm:text-3xl',
                                  sport.color,
                                  isSelected ? 'ring-4 ring-primary/20' : 'group-hover:scale-110'
                                )}
                              >
                                {sport.icon}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h3 className="mb-0.5 text-base font-semibold text-gray-900 dark:text-white sm:mb-1 sm:text-lg">
                                  {sport.name}
                                </h3>
                                <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                                  {sport.description}
                                </p>
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{stats?.posts.toLocaleString() || 0} posts</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>Active</span>
                              </div>
                            </div>

                            {/* Selection Indicator */}
                            {isSelected && (
                              <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary sm:h-6 sm:w-6">
                                  <div className="h-1.5 w-1.5 rounded-full bg-white sm:h-2 sm:w-2" />
                                </div>
                              </div>
                            )}

                            {/* Hover Effect */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-bright-cobalt/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex-shrink-0 border-t border-gray-200 px-4 pb-4 pt-4 dark:border-gray-700 sm:px-8 sm:pb-8 sm:pt-6">
                    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:gap-4">
                      <div className="text-center text-xs text-gray-600 dark:text-gray-400 sm:text-left sm:text-sm">
                        {selectedSport ? (
                          <span>
                            Showing posts from{' '}
                            <span className="font-semibold text-primary">
                              {SPORT_CATEGORIES.find((s) => s.id === selectedSport)?.name}
                            </span>
                          </span>
                        ) : (
                          'Showing posts from all sports'
                        )}
                      </div>

                      <div className="flex w-full gap-2 sm:w-auto sm:gap-3">
                        <button
                          onClick={() => handleSportClick('')}
                          className={cn(
                            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 sm:flex-none',
                            !selectedSport
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          )}
                        >
                          All Sports
                        </button>

                        {selectedSport && (
                          <button
                            onClick={onClose}
                            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary/90 sm:flex-none sm:px-6"
                          >
                            Apply Filter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
