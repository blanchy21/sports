"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Clock } from "lucide-react";
import { SPORT_CATEGORIES } from "@/types";
import { cn } from "@/lib/utils";

interface SportsFilterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSportSelect: (sportId: string) => void;
  selectedSport?: string;
}

export const SportsFilterPopup: React.FC<SportsFilterPopupProps> = ({
  isOpen,
  onClose,
  onSportSelect,
  selectedSport,
}) => {
  // Mock data for post counts (in real app, this would come from API)
  const sportStats = {
    'american-football': { posts: 1247 },
    football: { posts: 2156 },
    basketball: { posts: 892 },
    baseball: { posts: 543 },
    hockey: { posts: 678 },
    tennis: { posts: 445 },
    golf: { posts: 234 },
    mma: { posts: 567 },
    motorsports: { posts: 345 },
    cricket: { posts: 1890 },
    rugby: { posts: 456 },
    volleyball: { posts: 234 },
    badminton: { posts: 123 },
    'table-tennis': { posts: 89 },
    swimming: { posts: 567 },
    athletics: { posts: 345 },
    cycling: { posts: 678 },
    skiing: { posts: 234 },
    surfing: { posts: 123 },
    wrestling: { posts: 456 },
    gymnastics: { posts: 234 },
    weightlifting: { posts: 123 },
    archery: { posts: 89 },
    equestrian: { posts: 345 },
    sailing: { posts: 123 },
    climbing: { posts: 234 },
    darts: { posts: 456 },
    esports: { posts: 1234 },
    general: { posts: 1234 },
  };

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

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed z-50 w-[calc(100vw-2rem)] max-w-4xl max-h-[70vh] overflow-hidden"
            style={{ 
              top: '8vh',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-teal-600 px-8 py-6 relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Choose Your Sports
                  </h2>
                  <p className="text-white/80">
                    Filter your feed to see only the sports you care about
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col h-[calc(70vh-140px)]">
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SPORT_CATEGORIES.map((sport) => {
                      const stats = sportStats[sport.id as keyof typeof sportStats];
                      const isSelected = selectedSport === sport.id;
                      
                      return (
                        <motion.button
                          key={sport.id}
                          onClick={() => handleSportClick(sport.id)}
                          className={cn(
                            "group relative p-6 rounded-xl border-2 transition-all duration-200 text-left",
                            "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/50"
                          )}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                        {/* Sport Icon */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className={cn(
                            "w-16 h-16 rounded-xl flex items-center justify-center text-3xl transition-all duration-200 flex-shrink-0",
                            sport.color,
                            isSelected ? "ring-4 ring-primary/20" : "group-hover:scale-110"
                          )}>
                            {sport.icon}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                              {sport.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {sport.description}
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{stats?.posts.toLocaleString() || 0} posts</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Active</span>
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute top-3 left-3">
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          </div>
                        )}

                        {/* Hover Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-teal-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl" />
                      </motion.button>
                    );
                  })}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex-shrink-0 px-8 pb-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
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
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSportClick("")}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
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
                          className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors duration-200"
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
        </>
      )}
    </AnimatePresence>
  );
};
