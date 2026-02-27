'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/core/Card';
import { Button } from '@/components/core/Button';
import { Badge } from '@/components/core/Badge';
import {
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  Clock,
  TrendingUp,
  Server,
  Download,
  Trash2,
} from 'lucide-react';
import {
  getMonitoringStats,
  clearMonitoringData,
  exportMonitoringData,
} from '@/lib/hive-workerbee/monitoring';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminAccount } from '@/lib/admin/config';
import {
  getCacheStatistics as getCacheStats,
  clearOptimizationCache as clearOptCache,
} from '@/lib/hive-workerbee/optimization';
import { getHiveNodeHealthReport, startHiveNodeHealthMonitoring } from '@/lib/hive-workerbee/api';
import { LazyRealtimeFeed } from '@/components/lazy/LazyComponents';
import { logger } from '@/lib/logger';

interface MonitoringData {
  errors: {
    total: number;
    unresolved: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recentErrors: Array<{
      id: string;
      type: string;
      severity: string;
      message: string;
      timestamp: number;
      resolved: boolean;
    }>;
  };
  performance: {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    slowOperations: Array<{
      id: string;
      operation: string;
      duration: number;
      success: boolean;
      timestamp: number;
    }>;
    recentPerformance: Array<{
      id: string;
      operation: string;
      duration: number;
      success: boolean;
      timestamp: number;
    }>;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    recommendations: string[];
  };
}

interface NodeHealthData {
  totalNodes: number;
  healthyNodes: number;
  unhealthyNodes: number;
  averageLatency: number;
  bestNode: string;
  worstNode: string;
  nodeStatuses: Array<{
    url: string;
    isHealthy: boolean;
    latency: number;
    lastChecked: number;
    successRate: number;
    consecutiveFailures: number;
    lastError?: string;
    healthScore: number;
  }>;
}

export default function MonitoringPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [cacheStats, setCacheStats] = useState<{
    size: number;
    maxSize: number;
    hitRate: number;
  } | null>(null);
  const [nodeHealthData, setNodeHealthData] = useState<NodeHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  const username = user?.username;
  const isAdmin = !!username && isAdminAccount(username);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true);

      // Fetch all monitoring data
      const [monitoring, cache, nodeHealth] = await Promise.all([
        getMonitoringStats(),
        getCacheStats(),
        Promise.resolve(getHiveNodeHealthReport()),
      ]);

      setMonitoringData(monitoring);
      setCacheStats(cache);
      setNodeHealthData(nodeHealth);
      setLastUpdated(new Date());
    } catch (error) {
      logger.error('Error fetching monitoring data', 'MonitoringPage', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsClient(true);

    // Start node health monitoring
    startHiveNodeHealthMonitoring();

    fetchMonitoringData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClearData = async () => {
    try {
      await Promise.all([clearMonitoringData(), clearOptCache()]);
      await fetchMonitoringData();
    } catch (error) {
      logger.error('Error clearing data', 'MonitoringPage', error);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await exportMonitoringData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error exporting data', 'MonitoringPage', error);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-success/15 text-success border-success/30';
      case 'degraded':
        return 'bg-warning/15 text-warning border-warning/30';
      case 'unhealthy':
        return 'bg-destructive/15 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (isLoading && !monitoringData) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl p-6">
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading monitoring data...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <LazyRealtimeFeed className="shadow-sm" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">WorkerBee Monitoring Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Real-time performance monitoring and optimization metrics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={fetchMonitoringData} disabled={isLoading} variant="outline" size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleExportData} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={handleClearData}
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Data
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        {isClient && lastUpdated && (
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        )}

        {/* Health Status */}
        {monitoringData && (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center text-xl font-semibold">
                <Server className="mr-2 h-5 w-5" />
                System Health
              </h2>
              <Badge className={getHealthStatusColor(monitoringData.health.status)}>
                {getHealthStatusIcon(monitoringData.health.status)}
                <span className="ml-1 capitalize">{monitoringData.health.status}</span>
              </Badge>
            </div>

            {monitoringData.health.issues.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 font-medium text-destructive">Issues:</h3>
                <ul className="list-inside list-disc space-y-1">
                  {monitoringData.health.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-destructive">
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {monitoringData.health.recommendations.length > 0 && (
              <div>
                <h3 className="mb-2 font-medium text-info">Recommendations:</h3>
                <ul className="list-inside list-disc space-y-1">
                  {monitoringData.health.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-info">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Node Health Status */}
        {nodeHealthData && (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center text-xl font-semibold">
                <Activity className="mr-2 h-5 w-5" />
                Hive Node Health
              </h2>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">{nodeHealthData.healthyNodes}</p>
                  <p className="text-xs text-muted-foreground">Healthy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">
                    {nodeHealthData.unhealthyNodes}
                  </p>
                  <p className="text-xs text-muted-foreground">Unhealthy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-info">
                    {nodeHealthData.averageLatency.toFixed(0)}ms
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Latency</p>
                </div>
              </div>
            </div>

            {/* Node Status List */}
            <div className="space-y-3">
              {nodeHealthData.nodeStatuses.map((node) => (
                <div
                  key={node.url}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-3 w-3 rounded-full ${node.isHealthy ? 'bg-success' : 'bg-destructive'}`}
                    />
                    <div>
                      <p className="text-sm font-medium">{node.url}</p>
                      <p className="text-xs text-muted-foreground">
                        Health Score: {node.healthScore.toFixed(0)}% | Success Rate:{' '}
                        {node.successRate.toFixed(1)}% | Latency: {node.latency}ms
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={node.isHealthy ? 'default' : 'destructive'}>
                      {node.isHealthy ? 'Healthy' : 'Unhealthy'}
                    </Badge>
                    {node.lastError && (
                      <p className="mt-1 max-w-48 truncate text-xs text-destructive">
                        {node.lastError}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Best/Worst Node Info */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-success/10 p-3">
                <h4 className="mb-1 font-medium text-success">Best Node</h4>
                <p className="truncate text-sm text-success">{nodeHealthData.bestNode}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3">
                <h4 className="mb-1 font-medium text-destructive">Worst Node</h4>
                <p className="truncate text-sm text-destructive">{nodeHealthData.worstNode}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Operations */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Operations</p>
                <p className="text-2xl font-bold">
                  {monitoringData?.performance.totalOperations.toLocaleString() || '0'}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </Card>

          {/* Average Duration */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">
                  {monitoringData?.performance.averageDuration.toFixed(0) || '0'}ms
                </p>
              </div>
              <Clock className="h-8 w-8 text-accent" />
            </div>
          </Card>

          {/* Success Rate */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {monitoringData?.performance.successRate.toFixed(1) || '0'}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </Card>

          {/* Cache Hit Rate */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cache Hit Rate</p>
                <p className="text-2xl font-bold">{cacheStats?.hitRate || '0%'}</p>
              </div>
              <Database className="h-8 w-8 text-info" />
            </div>
          </Card>
        </div>

        {/* Error Statistics */}
        {monitoringData && (
          <Card className="p-6">
            <h2 className="mb-4 flex items-center text-xl font-semibold">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Error Statistics
            </h2>

            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-destructive">{monitoringData.errors.total}</p>
                <p className="text-sm text-muted-foreground">Total Errors</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {monitoringData.errors.unresolved}
                </p>
                <p className="text-sm text-muted-foreground">Unresolved</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-success">
                  {monitoringData.errors.total - monitoringData.errors.unresolved}
                </p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>

            {/* Recent Errors */}
            {monitoringData.errors.recentErrors.length > 0 && (
              <div>
                <h3 className="mb-3 font-medium">Recent Errors:</h3>
                <div className="space-y-2">
                  {monitoringData.errors.recentErrors.slice(0, 5).map((error) => (
                    <div
                      key={error.id}
                      className="flex items-center justify-between rounded-lg bg-destructive/10 p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant={error.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                        >
                          {error.severity}
                        </Badge>
                        <span className="text-sm font-medium">{error.type}</span>
                        <span className="text-sm text-muted-foreground">{error.message}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Cache Statistics */}
        {cacheStats && (
          <Card className="p-6">
            <h2 className="mb-4 flex items-center text-xl font-semibold">
              <Database className="mr-2 h-5 w-5" />
              Cache Statistics
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-info">{cacheStats.size}</p>
                <p className="text-sm text-muted-foreground">Cache Size</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{cacheStats.maxSize}</p>
                <p className="text-sm text-muted-foreground">Max Size</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-success">{cacheStats.hitRate}</p>
                <p className="text-sm text-muted-foreground">Hit Rate</p>
              </div>
            </div>
          </Card>
        )}

        {/* Performance History */}
        {monitoringData && monitoringData.performance.slowOperations.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-4 flex items-center text-xl font-semibold">
              <Clock className="mr-2 h-5 w-5" />
              Slow Operations
            </h2>

            <div className="space-y-2">
              {monitoringData.performance.slowOperations.slice(0, 10).map((op) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between rounded-lg bg-warning/10 p-3"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant={op.success ? 'default' : 'destructive'}>
                      {op.success ? 'Success' : 'Failed'}
                    </Badge>
                    <span className="text-sm font-medium">{op.operation}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-muted-foreground">{op.duration}ms</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(op.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
