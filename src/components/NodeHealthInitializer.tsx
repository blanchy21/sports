"use client";

import { useEffect } from 'react';

/**
 * Component to initialize Hive node health monitoring on app startup
 * This enables proactive monitoring of Hive API nodes for better failover
 * 
 * Note: Node health monitoring is now handled server-side via API routes
 * This component is kept for potential future client-side features
 */
export function NodeHealthInitializer() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Node health monitoring is handled server-side
    // The monitoring API route will be called automatically by the server
  }, []);

  // This component doesn't render anything
  return null;
}

