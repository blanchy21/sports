'use client';

import React from 'react';
import { AlertTriangle, WifiOff, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useServiceStatus, getServiceDisplayName, ServiceName } from '@/hooks/useServiceStatus';

interface ServiceStatusBannerProps {
  /** Only show for specific services */
  services?: ServiceName[];
  /** Allow dismissing the banner */
  dismissible?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
}

/**
 * ServiceStatusBanner - displays warnings when services are degraded or down
 *
 * Usage:
 * ```tsx
 * // In your layout or page
 * <ServiceStatusBanner />
 *
 * // Only show for specific services
 * <ServiceStatusBanner services={['hive', 'network']} />
 *
 * // Compact mode for inline display
 * <ServiceStatusBanner compact />
 * ```
 */
export function ServiceStatusBanner({
  services: filterServices,
  dismissible = true,
  compact = false,
}: ServiceStatusBannerProps) {
  const {
    services,
    isAnyDegraded: _isAnyDegraded,
    isAnyDown: _isAnyDown,
    refresh,
  } = useServiceStatus();
  const [dismissed, setDismissed] = React.useState<Set<ServiceName>>(new Set());

  // Filter services if specified
  const relevantServices = filterServices
    ? Object.values(services).filter((s) => filterServices.includes(s.name))
    : Object.values(services);

  // Get services that need attention
  const problemServices = relevantServices.filter(
    (s) => (s.status === 'degraded' || s.status === 'down') && !dismissed.has(s.name)
  );

  // Don't render if nothing to show
  if (problemServices.length === 0) {
    return null;
  }

  const handleDismiss = (name: ServiceName) => {
    setDismissed((prev) => new Set([...prev, name]));
  };

  const handleRefresh = () => {
    refresh();
    setDismissed(new Set());
  };

  // Determine severity (down is worse than degraded)
  const hasDownService = problemServices.some((s) => s.status === 'down');
  const bgColor = hasDownService ? 'bg-red-500/10' : 'bg-yellow-500/10';
  const borderColor = hasDownService ? 'border-red-500/20' : 'border-yellow-500/20';
  const iconColor = hasDownService ? 'text-red-500' : 'text-yellow-500';

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 rounded-md px-3 py-2 ${bgColor} ${borderColor} border`}
      >
        {hasDownService ? (
          <WifiOff className={`h-4 w-4 ${iconColor}`} />
        ) : (
          <AlertTriangle className={`h-4 w-4 ${iconColor}`} />
        )}
        <span className="text-sm text-foreground">
          {problemServices.map((s) => getServiceDisplayName(s.name)).join(', ')}{' '}
          {hasDownService ? 'unavailable' : 'experiencing issues'}
        </span>
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto h-6 w-6 p-0">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`${bgColor} ${borderColor} border-b`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${iconColor}`}>
            {hasDownService ? (
              <WifiOff className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>

          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {hasDownService
                ? 'Some services are currently unavailable'
                : 'Some services are experiencing issues'}
            </p>
            <div className="flex flex-wrap gap-2">
              {problemServices.map((service) => (
                <div
                  key={service.name}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <span className="font-medium">{getServiceDisplayName(service.name)}:</span>
                  <span>
                    {service.status === 'down'
                      ? service.message || 'Unavailable'
                      : service.message || 'Limited functionality'}
                  </span>
                  {dismissible && (
                    <button
                      onClick={() => handleDismiss(service.name)}
                      className="ml-1 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleRefresh} className="flex-shrink-0">
            <RefreshCw className="mr-1 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline status indicator
 */
export function ServiceStatusDot({ service }: { service: ServiceName }) {
  const { services } = useServiceStatus();
  const status = services[service];

  if (status.status === 'healthy') {
    return null;
  }

  const color = status.status === 'down' ? 'bg-red-500' : 'bg-yellow-500';

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color}`}
      title={`${getServiceDisplayName(service)}: ${status.message || status.status}`}
    />
  );
}
