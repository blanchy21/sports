import { useEffect, useCallback, useRef } from 'react';
import { 
  RealtimeEvent, 
  RealtimeEventCallback, 
  addRealtimeCallback, 
  removeRealtimeCallback, 
  startRealtimeMonitoring, 
  stopRealtimeMonitoring,
  getRealtimeStatus
} from '@/lib/hive-workerbee/realtime';

/**
 * Hook for real-time Hive blockchain monitoring
 */
export function useRealtime() {
  const callbacksRef = useRef<RealtimeEventCallback[]>([]);

  // Clean up callbacks on unmount
  useEffect(() => {
    return () => {
      callbacksRef.current.forEach(callback => {
        removeRealtimeCallback(callback);
      });
      callbacksRef.current = [];
    };
  }, []);

  /**
   * Add event callback
   */
  const addCallback = useCallback((callback: RealtimeEventCallback) => {
    addRealtimeCallback(callback);
    callbacksRef.current.push(callback);
  }, []);

  /**
   * Remove event callback
   */
  const removeCallback = useCallback((callback: RealtimeEventCallback) => {
    removeRealtimeCallback(callback);
    const index = callbacksRef.current.indexOf(callback);
    if (index > -1) {
      callbacksRef.current.splice(index, 1);
    }
  }, []);

  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(async () => {
    try {
      await startRealtimeMonitoring();
      console.log('[useRealtime] Monitoring started');
    } catch (error) {
      console.error('[useRealtime] Failed to start monitoring:', error);
    }
  }, []);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(async () => {
    try {
      await stopRealtimeMonitoring();
      console.log('[useRealtime] Monitoring stopped');
    } catch (error) {
      console.error('[useRealtime] Failed to stop monitoring:', error);
    }
  }, []);

  /**
   * Get monitoring status
   */
  const getStatus = useCallback(() => {
    return getRealtimeStatus();
  }, []);

  return {
    addCallback,
    removeCallback,
    startMonitoring,
    stopMonitoring,
    getStatus
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
export function useNewPosts(callback: (event: RealtimeEvent & { type: 'new_post' }) => void, enabled: boolean = true) {
  useRealtimeEvent('new_post', callback, enabled);
}

/**
 * Hook for monitoring new votes
 */
export function useNewVotes(callback: (event: RealtimeEvent & { type: 'new_vote' }) => void, enabled: boolean = true) {
  useRealtimeEvent('new_vote', callback, enabled);
}

/**
 * Hook for monitoring new comments
 */
export function useNewComments(callback: (event: RealtimeEvent & { type: 'new_comment' }) => void, enabled: boolean = true) {
  useRealtimeEvent('new_comment', callback, enabled);
}
