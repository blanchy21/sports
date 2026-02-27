'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeState } from '@/types';
import { logger } from '@/lib/logger';

const ThemeContext = createContext<ThemeState | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Start with null to prevent hydration mismatch
  const [theme, setThemeState] = useState<'light' | 'dark' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    } else {
      // Default to dark on mobile devices, follow system preference on desktop
      const isMobile = window.innerWidth < 1024;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(isMobile || prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    if (!mounted || !theme) return;

    // Update the DOM
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Save to localStorage
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      logger.error('Error saving theme to localStorage', 'ThemeContext', error);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const value: ThemeState = {
    theme: theme || 'light', // Default to light for SSR
    setTheme,
    toggleTheme,
  };

  // Prevent hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
