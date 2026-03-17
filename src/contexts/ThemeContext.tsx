'use client';

import React, { createContext, useContext, useEffect } from 'react';
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
  // Brand is dark-only — always dark
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
    try {
      localStorage.setItem('theme', 'dark');
    } catch (error) {
      logger.error('Error saving theme to localStorage', 'ThemeContext', error);
    }
  }, []);

  const setTheme = (_newTheme: 'light' | 'dark') => {
    // No-op: brand is dark-only
  };

  const toggleTheme = () => {
    // No-op: brand is dark-only
  };

  const value: ThemeState = {
    theme: 'dark',
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
