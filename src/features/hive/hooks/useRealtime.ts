'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

// Local type definitions — mirrors realtime.ts without importing server-only code
export interface RealtimeEvent {
  type: 'new_post' | 'new_vote' | 'new_comment';
  [key: string]: unknown;
}

export type RealtimeEventCallback = (event: RealtimeEvent) => void;

/**
 * Realtime monitoring state
 */
export interface RealtimeState {
  isMonitoring: boolean;
  isConnecting: boolean;
  error: Error | null;
  retryCount: number;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Hook for real-time Hive blockchain monitoring
 * Provides state management for monitoring status, errors, and retry logic
 */
export function useRealtime() {
  const callbacksRef = useRef<RealtimeEventCallback[]>([]);
  const [state, setState] = useState<RealtimeState>({
    isMonitoring: false,
    isConnecting: false,
    error: null,
    retryCount: 0,
  });

  // Clean up callbacks on unmount
  useEffect(() => {
    return () => {
      callbacksRef.current = [];
    };
  }, []);

  /**
   * Add event callback (client-local — events dispatched via polling/SSE in future)
   */
  const addCallback = useCallback((callback: RealtimeEventCallback) => {
    callbacksRef.current.push(callback);
  }, []);

  /**
   * Remove event callback
   */
  const removeCallback = useCallback((callback: RealtimeEventCallback) => {
    const index = callbacksRef.current.indexOf(callback);
    if (index > -1) {
      callbacksRef.current.splice(index, 1);
    }
  }, []);

  /**
   * Start monitoring with retry logic
   */
  const startMonitoring = useCallback(async (retryAttempt = 0): Promise<boolean> => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const res = await fetch('/api/hive/realtime', { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to start monitoring: ${res.status}`);

      setState({
        isMonitoring: true,
        isConnecting: false,
        error: null,
        retryCount: 0,
      });
      return true;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        setState((prev) => ({
          ...prev,
          isConnecting: true,
          retryCount: retryAttempt + 1,
        }));

        // Wait before retrying with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retryAttempt))
        );

        return startMonitoring(retryAttempt + 1);
      }

      // Max retries exceeded
      setState({
        isMonitoring: false,
        isConnecting: false,
        error: errorObj,
        retryCount: retryAttempt,
      });

      return false;
    }
  }, []);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/hive/realtime', { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to stop monitoring: ${res.status}`);

      setState((prev) => ({
        ...prev,
        isMonitoring: false,
        error: null,
      }));
      return true;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setState((prev) => ({
        ...prev,
        error: errorObj,
      }));
      return false;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, retryCount: 0 }));
  }, []);

  /**
   * Get monitoring status from local state
   */
  const getStatus = useCallback(() => {
    return { isRunning: state.isMonitoring };
  }, [state.isMonitoring]);

  return {
    // State
    isMonitoring: state.isMonitoring,
    isConnecting: state.isConnecting,
    error: state.error,
    retryCount: state.retryCount,
    // Actions
    addCallback,
    removeCallback,
    startMonitoring,
    stopMonitoring,
    clearError,
    getStatus,
  };
}

/**
 * Hook for monitoring specific events
 */
export function useRealtimeEvent<T extends RealtimeEvent>(
  eventType: T['type'],
  callback: (event: T) => void,
  enabled: boolean = true
) {
  const { addCallback, removeCallback } = useRealtime();
  const callbackRef = useRef<RealtimeEventCallback | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const eventCallback: RealtimeEventCallback = (event) => {
      if (event.type === eventType) {
        callback(event as T);
      }
    };

    addCallback(eventCallback);
    callbackRef.current = eventCallback;

    return () => {
      if (callbackRef.current) {
        removeCallback(callbackRef.current);
        callbackRef.current = null;
      }
    };
  }, [eventType, callback, enabled, addCallback, removeCallback]);
}

/**
 * Hook for monitoring new posts
 */
export function useNewPosts(
  callback: (event: RealtimeEvent & { type: 'new_post' }) => void,
  enabled: boolean = true
) {
  useRealtimeEvent('new_post', callback, enabled);
}

/**
 * Hook for monitoring new votes
 */
export function useNewVotes(
  callback: (event: RealtimeEvent & { type: 'new_vote' }) => void,
  enabled: boolean = true
) {
  useRealtimeEvent('new_vote', callback, enabled);
}

/**
 * Hook for monitoring new comments
 */
export function useNewComments(
  callback: (event: RealtimeEvent & { type: 'new_comment' }) => void,
  enabled: boolean = true
) {
  useRealtimeEvent('new_comment', callback, enabled);
}
