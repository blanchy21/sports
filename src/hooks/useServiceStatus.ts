/**
 * Service Status Hook
 *
 * Provides real-time status of external services (Hive, network)
 * and displays appropriate warnings when services are degraded.
 */

import { useState, useEffect, useCallback } from 'react';
import { getDegradationStatus } from '@/lib/hive-workerbee/graceful-degradation';

export type ServiceName = 'hive' | 'network';

export interface ServiceStatus {
  name: ServiceName;
  status: 'healthy' | 'degraded' | 'down';
  message?: string;
  lastChecked: number;
}

export interface ServiceStatusState {
  services: Record<ServiceName, ServiceStatus>;
  isAnyDegraded: boolean;
  isAnyDown: boolean;
  degradedServices: ServiceName[];
  downServices: ServiceName[];
  refresh: () => void;
}

const DEFAULT_STATUS: ServiceStatus = {
  name: 'hive',
  status: 'healthy',
  lastChecked: Date.now(),
};

/**
 * Hook to monitor service status
 */
export function useServiceStatus(refreshInterval = 30000): ServiceStatusState {
  const [services, setServices] = useState<Record<ServiceName, ServiceStatus>>({
    hive: { ...DEFAULT_STATUS, name: 'hive' },
    network: { ...DEFAULT_STATUS, name: 'network' },
  });

  const checkHiveStatus = useCallback((): ServiceStatus => {
    try {
      const status = getDegradationStatus();

      if (status.isDegraded) {
        return {
          name: 'hive',
          status: 'degraded',
          message: `Serving cached data (${Math.round(status.averageStaleAge / 1000)}s old)`,
          lastChecked: Date.now(),
        };
      }

      return {
        name: 'hive',
        status: 'healthy',
        lastChecked: Date.now(),
      };
    } catch {
      return {
        name: 'hive',
        status: 'down',
        message: 'Unable to check Hive status',
        lastChecked: Date.now(),
      };
    }
  }, []);

  const checkNetworkStatus = useCallback((): ServiceStatus => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    return {
      name: 'network',
      status: isOnline ? 'healthy' : 'down',
      message: isOnline ? undefined : 'No internet connection',
      lastChecked: Date.now(),
    };
  }, []);

  const refresh = useCallback(() => {
    setServices({
      hive: checkHiveStatus(),
      network: checkNetworkStatus(),
    });
  }, [checkHiveStatus, checkNetworkStatus]);

  // Initial check and periodic refresh
  useEffect(() => {
    refresh();

    const interval = setInterval(refresh, refreshInterval);

    // Listen for online/offline events
    const handleOnline = () => {
      setServices((prev) => ({
        ...prev,
        network: { name: 'network', status: 'healthy', lastChecked: Date.now() },
      }));
    };

    const handleOffline = () => {
      setServices((prev) => ({
        ...prev,
        network: {
          name: 'network',
          status: 'down',
          message: 'No internet connection',
          lastChecked: Date.now(),
        },
      }));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [refresh, refreshInterval]);

  // Compute derived state
  const degradedServices = Object.values(services)
    .filter((s) => s.status === 'degraded')
    .map((s) => s.name);

  const downServices = Object.values(services)
    .filter((s) => s.status === 'down')
    .map((s) => s.name);

  return {
    services,
    isAnyDegraded: degradedServices.length > 0,
    isAnyDown: downServices.length > 0,
    degradedServices,
    downServices,
    refresh,
  };
}

/**
 * Get user-friendly service name
 */
export function getServiceDisplayName(name: ServiceName): string {
  const names: Record<ServiceName, string> = {
    hive: 'Hive Blockchain',
    network: 'Network',
  };
  return names[name];
}

/**
 * Get status color class
 */
export function getStatusColor(status: ServiceStatus['status']): string {
  switch (status) {
    case 'healthy':
      return 'text-green-500';
    case 'degraded':
      return 'text-yellow-500';
    case 'down':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Get status background class
 */
export function getStatusBgColor(status: ServiceStatus['status']): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-500/10';
    case 'degraded':
      return 'bg-yellow-500/10';
    case 'down':
      return 'bg-red-500/10';
    default:
      return 'bg-muted';
  }
}
