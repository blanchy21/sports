"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AiohaProvider as AiohaUIProvider } from '@aioha/react-ui';
import { AIOHA_STUB_EVENT, getAiohaInstance } from '@/lib/aioha/config';


// Aioha context type
interface AiohaContextType {
  aioha: unknown | null;
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
  const [aiohaInstance, setAiohaInstance] = useState<unknown | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  type AiohaUIInstance = NonNullable<React.ComponentProps<typeof AiohaUIProvider>['aioha']>;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const resolveInstance = () => {
      if (window.__AIOHA_FORCE_STUB__ && typeof window.__AIOHA_TEST_STUB__ !== 'undefined') {
        setAiohaInstance(window.__AIOHA_TEST_STUB__ ?? null);
        setIsInitialized(true);
        setError(null);
        return;
      }

      try {
        const instance = getAiohaInstance();
        if (instance) {
          setAiohaInstance(instance);
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

    const handleStubApplied = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setAiohaInstance(detail ?? window.__AIOHA_TEST_STUB__ ?? null);
      setIsInitialized(true);
      setError(null);
    };

    resolveInstance();
    window.addEventListener(AIOHA_STUB_EVENT, handleStubApplied);

    const originalSetter = window.__SET_AIOHA_STUB__;
    if (originalSetter) {
      window.__SET_AIOHA_STUB__ = (stub: unknown) => {
        originalSetter(stub);
        setAiohaInstance(stub ?? null);
        setIsInitialized(true);
        setError(null);
      };
    }

    return () => {
      window.removeEventListener(AIOHA_STUB_EVENT, handleStubApplied);
      if (originalSetter) {
        window.__SET_AIOHA_STUB__ = originalSetter;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const debugWindow = window as typeof window & {
        __AIOHA_DEBUG_STATE__?: {
          isInitialized: boolean;
          error: string | null;
          hasInstance: boolean;
          providerMethods: string[];
        };
      };
      debugWindow.__AIOHA_DEBUG_STATE__ = {
        isInitialized,
        error,
        hasInstance: Boolean(aiohaInstance),
        providerMethods:
          typeof aiohaInstance === 'object' && aiohaInstance !== null
            ? Object.keys(aiohaInstance as Record<string, unknown>)
            : [],
      };
    }
  }, [aiohaInstance, isInitialized, error]);

  const contextValue: AiohaContextType = {
    aioha: aiohaInstance,
    isInitialized,
    error,
  };

  return (
    <AiohaContext.Provider value={contextValue}>
      {!!aiohaInstance && (
        <AiohaUIProvider aioha={aiohaInstance as AiohaUIInstance}>
          {children}
        </AiohaUIProvider>
      )}
      {!aiohaInstance && children}
    </AiohaContext.Provider>
  );
};
