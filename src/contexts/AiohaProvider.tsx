"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AiohaProvider as AiohaUIProvider } from '@aioha/react-ui';
import { aioha } from '@/lib/aioha/config';

// Aioha context type
interface AiohaContextType {
  aioha: any | null;
  isInitialized: boolean;
  error: string | null;
}

const AiohaContext = createContext<AiohaContextType | undefined>(undefined);

// Custom hook to use Aioha context
export const useAioha = () => {
  const context = useContext(AiohaContext);
  if (context === undefined) {
    throw new Error('useAioha must be used within an AiohaProvider');
  }
  return context;
};

interface AiohaProviderProps {
  children: React.ReactNode;
}

export const AiohaProvider: React.FC<AiohaProviderProps> = ({ children }) => {
  const [aiohaInstance, setAiohaInstance] = useState<any | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Aioha only in browser
    const initializeAioha = async () => {
      try {
        if (typeof window !== 'undefined' && aioha) {
          setAiohaInstance(aioha);
          setIsInitialized(true);
          setError(null);
        } else {
          setIsInitialized(false);
        }
      } catch (err) {
        console.error('Failed to initialize Aioha:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Aioha');
        setIsInitialized(false);
      }
    };

    initializeAioha();
  }, []);

  const contextValue: AiohaContextType = {
    aioha: aiohaInstance,
    isInitialized,
    error,
  };

  return (
    <AiohaContext.Provider value={contextValue}>
      {aiohaInstance && (
        <AiohaUIProvider aioha={aiohaInstance}>
          {children}
        </AiohaUIProvider>
      )}
      {!aiohaInstance && children}
    </AiohaContext.Provider>
  );
};
