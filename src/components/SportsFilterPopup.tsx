"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Clock } from "lucide-react";
import { SPORT_CATEGORIES } from "@/types";
import { cn } from "@/lib/utils";

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
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Popup Container - using flexbox for centering to avoid Framer Motion transform conflicts */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pr-[100px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-3xl max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-hidden"
            >
            <div className="bg-card dark:bg-card rounded-2xl shadow-2xl border border-border h-full flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-bright-cobalt px-4 sm:px-8 py-4 sm:py-6 relative flex-shrink-0">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="pr-10">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">
                    Choose Your Sports
                  </h2>
                  <p className="text-sm sm:text-base text-white/80">
                    Filter your feed to see only the sports you care about
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {SPORT_CATEGORIES.map((sport) => {
                      const stats = sportStats[sport.id];
                      const isSelected = selectedSport === sport.id;
                      
                      return (
                        <motion.button
                          key={sport.id}
                          onClick={() => handleSportClick(sport.id)}
                          className={cn(
                            "group relative p-3 sm:p-6 rounded-xl border-2 transition-all duration-200 text-left",
                            "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border bg-card hover:border-primary/50"
                          )}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                        {/* Sport Icon */}
                        <div className="flex items-start gap-3 sm:gap-4 mb-2 sm:mb-4">
                          <div className={cn(
                            "w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-3xl transition-all duration-200 flex-shrink-0",
                            sport.color,
                            isSelected ? "ring-4 ring-primary/20" : "group-hover:scale-110"
                          )}>
                            {sport.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-0.5 sm:mb-1">
                              {sport.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                              {sport.description}
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
                          <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" />
                            </div>
                          </div>
                        )}

                        {/* Hover Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-bright-cobalt/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl" />
                      </motion.button>
                    );
                  })}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex-shrink-0 px-4 sm:px-8 pb-4 sm:pb-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-center">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                      {selectedSport ? (
                        <span>
                          Showing posts from{" "}
                          <span className="font-semibold text-primary">
                            {SPORT_CATEGORIES.find(s => s.id === selectedSport)?.name}
                          </span>
                        </span>
                      ) : (
                        "Showing posts from all sports"
                      )}
                    </div>

                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => handleSportClick("")}
                        className={cn(
                          "flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                          !selectedSport
                            ? "bg-primary text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        )}
                      >
                        All Sports
                      </button>

                      {selectedSport && (
                        <button
                          onClick={onClose}
                          className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors duration-200"
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
