"use client";

import { useEffect } from 'react';
import { startHiveNodeHealthMonitoring } from '@/lib/hive-workerbee/api';
import { info as logInfo, error as logError } from '@/lib/hive-workerbee/logger';

/**
 * Component to initialize Hive node health monitoring on app startup
 * This enables proactive monitoring of Hive API nodes for better failover
 */
export function NodeHealthInitializer() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Start node health monitoring
    startHiveNodeHealthMonitoring()
      .then(() => {
        logInfo('Node health monitoring initialized');
      })
      .catch((error) => {
        logError('Failed to initialize node health monitoring', 'NodeHealthInitializer', error instanceof Error ? error : undefined);
      });
  }, []);

  // This component doesn't render anything
  return null;
}

