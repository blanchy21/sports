"use client";

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
  Trash2
} from 'lucide-react';
import { 
  getMonitoringStats, 
  clearMonitoringData,
  exportMonitoringData
} from '@/lib/hive-workerbee/monitoring';
import { 
  getCacheStatistics as getCacheStats,
  clearOptimizationCache as clearOptCache
} from '@/lib/hive-workerbee/optimization';
import { 
  getHiveNodeHealthReport,
  startHiveNodeHealthMonitoring
} from '@/lib/hive-workerbee/api';

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
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [cacheStats, setCacheStats] = useState<{ size: number; maxSize: number; hitRate: number } | null>(null);
  const [nodeHealthData, setNodeHealthData] = useState<NodeHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all monitoring data
      const [monitoring, cache, nodeHealth] = await Promise.all([
        getMonitoringStats(),
        getCacheStats(),
        Promise.resolve(getHiveNodeHealthReport())
      ]);

      setMonitoringData(monitoring);
      setCacheStats(cache);
      setNodeHealthData(nodeHealth);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
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
      await Promise.all([
        clearMonitoringData(),
        clearOptCache()
      ]);
      await fetchMonitoringData();
    } catch (error) {
      console.error('Error clearing data:', error);
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
      console.error('Error exporting data:', error);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  if (isLoading && !monitoringData) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading monitoring data...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">WorkerBee Monitoring Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Real-time performance monitoring and optimization metrics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={fetchMonitoringData}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleExportData}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={handleClearData}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Server className="h-5 w-5 mr-2" />
                System Health
              </h2>
              <Badge className={getHealthStatusColor(monitoringData.health.status)}>
                {getHealthStatusIcon(monitoringData.health.status)}
                <span className="ml-1 capitalize">{monitoringData.health.status}</span>
              </Badge>
            </div>
            
            {monitoringData.health.issues.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-red-600 mb-2">Issues:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {monitoringData.health.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-600">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {monitoringData.health.recommendations.length > 0 && (
              <div>
                <h3 className="font-medium text-blue-600 mb-2">Recommendations:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {monitoringData.health.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-600">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Node Health Status */}
        {nodeHealthData && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Hive Node Health
              </h2>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{nodeHealthData.healthyNodes}</p>
                  <p className="text-xs text-muted-foreground">Healthy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{nodeHealthData.unhealthyNodes}</p>
                  <p className="text-xs text-muted-foreground">Unhealthy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{nodeHealthData.averageLatency.toFixed(0)}ms</p>
                  <p className="text-xs text-muted-foreground">Avg Latency</p>
                </div>
              </div>
            </div>
            
            {/* Node Status List */}
            <div className="space-y-3">
              {nodeHealthData.nodeStatuses.map((node) => (
                <div key={node.url} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${node.isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="font-medium text-sm">{node.url}</p>
                      <p className="text-xs text-muted-foreground">
                        Health Score: {node.healthScore.toFixed(0)}% | 
                        Success Rate: {node.successRate.toFixed(1)}% | 
                        Latency: {node.latency}ms
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={node.isHealthy ? 'default' : 'destructive'}>
                      {node.isHealthy ? 'Healthy' : 'Unhealthy'}
                    </Badge>
                    {node.lastError && (
                      <p className="text-xs text-red-600 mt-1 truncate max-w-48">
                        {node.lastError}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Best/Worst Node Info */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-1">Best Node</h4>
                <p className="text-sm text-green-700 truncate">{nodeHealthData.bestNode}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <h4 className="font-medium text-red-800 mb-1">Worst Node</h4>
                <p className="text-sm text-red-700 truncate">{nodeHealthData.worstNode}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          {/* Cache Hit Rate */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cache Hit Rate</p>
                <p className="text-2xl font-bold">
                  {cacheStats?.hitRate || '0%'}
                </p>
              </div>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
        </div>

        {/* Error Statistics */}
        {monitoringData && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Error Statistics
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {monitoringData.errors.total}
                </p>
                <p className="text-sm text-muted-foreground">Total Errors</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {monitoringData.errors.unresolved}
                </p>
                <p className="text-sm text-muted-foreground">Unresolved</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {monitoringData.errors.total - monitoringData.errors.unresolved}
                </p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>

            {/* Recent Errors */}
            {monitoringData.errors.recentErrors.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Recent Errors:</h3>
                <div className="space-y-2">
                  {monitoringData.errors.recentErrors.slice(0, 5).map((error) => (
                    <div key={error.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={error.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
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
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Cache Statistics
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {cacheStats.size}
                </p>
                <p className="text-sm text-muted-foreground">Cache Size</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {cacheStats.maxSize}
                </p>
                <p className="text-sm text-muted-foreground">Max Size</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {cacheStats.hitRate}
                </p>
                <p className="text-sm text-muted-foreground">Hit Rate</p>
              </div>
            </div>
          </Card>
        )}

        {/* Performance History */}
        {monitoringData && monitoringData.performance.slowOperations.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Slow Operations
            </h2>
            
            <div className="space-y-2">
              {monitoringData.performance.slowOperations.slice(0, 10).map((op) => (
                <div key={op.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={op.success ? 'default' : 'destructive'}>
                      {op.success ? 'Success' : 'Failed'}
                    </Badge>
                    <span className="text-sm font-medium">{op.operation}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-muted-foreground">
                      {op.duration}ms
                    </span>
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
