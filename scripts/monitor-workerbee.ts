#!/usr/bin/env node

/**
 * WorkerBee Command-Line Monitoring Tool
 * 
 * This script provides command-line access to WorkerBee monitoring data
 * and allows you to view performance metrics, cache statistics, and health status.
 */

import { performance } from 'perf_hooks';

// Type definitions for better type safety
interface ErrorData {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: number;
  resolved: boolean;
}

interface OperationData {
  id: string;
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

interface ErrorStats {
  total: number;
  unresolved: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentErrors: ErrorData[];
}

interface PerformanceStats {
  totalOperations: number;
  averageDuration: number;
  successRate: number;
  slowOperations: OperationData[];
  recentPerformance: OperationData[];
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  recommendations: string[];
}

interface MonitoringStats {
  errors: ErrorStats;
  performance: PerformanceStats;
  health: HealthStatus;
}

interface OptimizationMetrics {
  requestCount: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdated: number;
}

interface CacheStatistics {
  size: number;
  maxSize: number;
  hitRate: number;
}

// Mock monitoring data for demonstration
class MockMonitoringData {
  private startTime: number;
  private requestCount: number;
  private errorCount: number;
  private cacheHits: number;
  private cacheMisses: number;

  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  getMonitoringStats(): MonitoringStats {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    const cacheHitRate = (this.cacheHits + this.cacheMisses) > 0 ? 
      (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100 : 0;

    return {
      errors: {
        total: this.errorCount,
        unresolved: Math.floor(this.errorCount * 0.3),
        byType: {
          'CONNECTION_ERROR': Math.floor(this.errorCount * 0.4),
          'API_ERROR': Math.floor(this.errorCount * 0.3),
          'TIMEOUT_ERROR': Math.floor(this.errorCount * 0.2),
          'VALIDATION_ERROR': Math.floor(this.errorCount * 0.1)
        },
        bySeverity: {
          'LOW': Math.floor(this.errorCount * 0.5),
          'MEDIUM': Math.floor(this.errorCount * 0.3),
          'HIGH': Math.floor(this.errorCount * 0.15),
          'CRITICAL': Math.floor(this.errorCount * 0.05)
        },
        recentErrors: this.generateRecentErrors()
      },
      performance: {
        totalOperations: this.requestCount,
        averageDuration: 150 + Math.random() * 100,
        successRate: 100 - errorRate,
        slowOperations: this.generateSlowOperations(),
        recentPerformance: this.generateRecentPerformance()
      },
      health: {
        status: errorRate > 10 ? 'unhealthy' : errorRate > 5 ? 'degraded' : 'healthy',
        issues: this.generateIssues(errorRate),
        recommendations: this.generateRecommendations(errorRate)
      }
    };
  }

  getOptimizationMetrics(): OptimizationMetrics {
    return {
      requestCount: this.requestCount,
      averageResponseTime: 150 + Math.random() * 100,
      cacheHitRate: (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100,
      errorRate: (this.errorCount / this.requestCount) * 100,
      lastUpdated: Date.now()
    };
  }

  getCacheStatistics(): CacheStatistics {
    return {
      size: Math.floor(Math.random() * 500) + 100,
      maxSize: 1000,
      hitRate: (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100
    };
  }

  private generateRecentErrors(): ErrorData[] {
    const errors: ErrorData[] = [];
    const errorTypes = ['CONNECTION_ERROR', 'API_ERROR', 'TIMEOUT_ERROR', 'VALIDATION_ERROR'];
    const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    
    for (let i = 0; i < Math.min(5, this.errorCount); i++) {
      errors.push({
        id: `error-${i}`,
        type: errorTypes[Math.floor(Math.random() * errorTypes.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        message: `Error message ${i + 1}`,
        timestamp: Date.now() - Math.random() * 3600000,
        resolved: Math.random() > 0.3
      });
    }
    
    return errors;
  }

  private generateSlowOperations(): OperationData[] {
    const operations: OperationData[] = [];
    const operationTypes = ['fetchUserAccount', 'fetchSportsblockPosts', 'castVote', 'publishPost'];
    
    for (let i = 0; i < Math.min(3, this.requestCount); i++) {
      operations.push({
        id: `op-${i}`,
        operation: operationTypes[Math.floor(Math.random() * operationTypes.length)],
        duration: 500 + Math.random() * 1000,
        success: Math.random() > 0.1,
        timestamp: Date.now() - Math.random() * 1800000
      });
    }
    
    return operations;
  }

  private generateRecentPerformance(): OperationData[] {
    const performance: OperationData[] = [];
    const operationTypes = ['fetchUserAccount', 'fetchSportsblockPosts', 'castVote', 'publishPost'];
    
    for (let i = 0; i < Math.min(10, this.requestCount); i++) {
      performance.push({
        id: `perf-${i}`,
        operation: operationTypes[Math.floor(Math.random() * operationTypes.length)],
        duration: 50 + Math.random() * 200,
        success: Math.random() > 0.05,
        timestamp: Date.now() - Math.random() * 300000
      });
    }
    
    return performance;
  }

  private generateIssues(errorRate: number): string[] {
    const issues: string[] = [];
    if (errorRate > 10) issues.push('High error rate detected');
    if (errorRate > 5) issues.push('Elevated error rate');
    if (this.cacheHits < this.cacheMisses) issues.push('Low cache hit rate');
    return issues;
  }

  private generateRecommendations(errorRate: number): string[] {
    const recommendations: string[] = [];
    if (errorRate > 5) recommendations.push('Review error logs and fix issues');
    if (this.cacheHits < this.cacheMisses) recommendations.push('Optimize cache configuration');
    if (this.requestCount > 1000) recommendations.push('Consider rate limiting');
    return recommendations;
  }

  // Simulate some activity
  simulateActivity(): void {
    setInterval(() => {
      this.requestCount++;
      if (Math.random() < 0.1) {
        this.errorCount++;
      }
      if (Math.random() < 0.7) {
        this.cacheHits++;
      } else {
        this.cacheMisses++;
      }
    }, 1000);
  }
}

class MonitoringCLI {
  private monitoringData: MockMonitoringData;

  constructor() {
    this.monitoringData = new MockMonitoringData();
    this.monitoringData.simulateActivity();
  }

  private displayHeader(): void {
    console.log('\n🔬 WorkerBee Monitoring Dashboard');
    console.log('==================================');
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log('');
  }

  private displayHealthStatus(): void {
    const stats = this.monitoringData.getMonitoringStats();
    const health = stats.health;
    
    console.log('🏥 System Health');
    console.log('================');
    
    const statusIcon = health.status === 'healthy' ? '✅' : 
                      health.status === 'degraded' ? '⚠️' : '❌';
    
    console.log(`Status: ${statusIcon} ${health.status.toUpperCase()}`);
    
    if (health.issues.length > 0) {
      console.log('\nIssues:');
      health.issues.forEach(issue => console.log(`  • ${issue}`));
    }
    
    if (health.recommendations.length > 0) {
      console.log('\nRecommendations:');
      health.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
    
    console.log('');
  }

  private displayPerformanceMetrics(): void {
    const stats = this.monitoringData.getMonitoringStats();
    const performance = stats.performance;
    const optimization = this.monitoringData.getOptimizationMetrics();
    
    console.log('📊 Performance Metrics');
    console.log('======================');
    console.log(`Total Operations: ${performance.totalOperations.toLocaleString()}`);
    console.log(`Average Duration: ${performance.averageDuration.toFixed(0)}ms`);
    console.log(`Success Rate: ${performance.successRate.toFixed(1)}%`);
    console.log(`Cache Hit Rate: ${optimization.cacheHitRate.toFixed(1)}%`);
    console.log('');
  }

  private displayErrorStatistics(): void {
    const stats = this.monitoringData.getMonitoringStats();
    const errors = stats.errors;
    
    console.log('🚨 Error Statistics');
    console.log('===================');
    console.log(`Total Errors: ${errors.total}`);
    console.log(`Unresolved: ${errors.unresolved}`);
    console.log(`Resolved: ${errors.total - errors.unresolved}`);
    console.log('');
    
    if (Object.keys(errors.byType).length > 0) {
      console.log('Errors by Type:');
      Object.entries(errors.byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
      console.log('');
    }
    
    if (Object.keys(errors.bySeverity).length > 0) {
      console.log('Errors by Severity:');
      Object.entries(errors.bySeverity).forEach(([severity, count]) => {
        console.log(`  ${severity}: ${count}`);
      });
      console.log('');
    }
  }

  private displayCacheStatistics(): void {
    const cacheStats = this.monitoringData.getCacheStatistics();
    
    console.log('💾 Cache Statistics');
    console.log('==================');
    console.log(`Cache Size: ${cacheStats.size}/${cacheStats.maxSize}`);
    console.log(`Hit Rate: ${cacheStats.hitRate.toFixed(1)}%`);
    console.log(`Usage: ${((cacheStats.size / cacheStats.maxSize) * 100).toFixed(1)}%`);
    console.log('');
  }

  private displayRecentActivity(): void {
    const stats = this.monitoringData.getMonitoringStats();
    
    if (stats.errors.recentErrors.length > 0) {
      console.log('🕐 Recent Errors');
      console.log('================');
      stats.errors.recentErrors.slice(0, 3).forEach(error => {
        const timeAgo = new Date(error.timestamp).toLocaleString();
        console.log(`[${error.severity}] ${error.type}: ${error.message} (${timeAgo})`);
      });
      console.log('');
    }
    
    if (stats.performance.slowOperations.length > 0) {
      console.log('🐌 Slow Operations');
      console.log('==================');
      stats.performance.slowOperations.slice(0, 3).forEach(op => {
        const timeAgo = new Date(op.timestamp).toLocaleString();
        console.log(`${op.operation}: ${op.duration}ms (${timeAgo})`);
      });
      console.log('');
    }
  }

  private displaySummary(): void {
    const stats = this.monitoringData.getMonitoringStats();
    const optimization = this.monitoringData.getOptimizationMetrics();
    
    console.log('📋 Summary');
    console.log('==========');
    console.log(`🟢 System Status: ${stats.health.status.toUpperCase()}`);
    console.log(`📈 Total Operations: ${stats.performance.totalOperations.toLocaleString()}`);
    console.log(`⚡ Average Response: ${stats.performance.averageDuration.toFixed(0)}ms`);
    console.log(`✅ Success Rate: ${stats.performance.successRate.toFixed(1)}%`);
    console.log(`💾 Cache Hit Rate: ${optimization.cacheHitRate.toFixed(1)}%`);
    console.log(`🚨 Total Errors: ${stats.errors.total}`);
    console.log('');
  }

  async run(): Promise<void> {
    this.displayHeader();
    this.displayHealthStatus();
    this.displayPerformanceMetrics();
    this.displayErrorStatistics();
    this.displayCacheStatistics();
    this.displayRecentActivity();
    this.displaySummary();
    
    console.log('💡 Tip: Run this script periodically to monitor system health');
    console.log('🔗 Web Dashboard: http://localhost:3000/monitoring');
    console.log('');
  }

  async runContinuous(): Promise<void> {
    console.log('🔄 Starting continuous monitoring (Ctrl+C to stop)...\n');
    
    setInterval(async () => {
      console.clear();
      this.displayHeader();
      this.displayHealthStatus();
      this.displayPerformanceMetrics();
      this.displaySummary();
    }, 5000);
  }
}

// Command line interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  const cli = new MonitoringCLI();

  switch (command) {
    case 'continuous':
    case 'watch':
      await cli.runContinuous();
      break;
    case 'help':
      console.log('WorkerBee Monitoring CLI');
      console.log('========================');
      console.log('');
      console.log('Usage: node scripts/monitor-workerbee.ts [command]');
      console.log('');
      console.log('Commands:');
      console.log('  (no command)  - Display current status');
      console.log('  continuous    - Run continuous monitoring');
      console.log('  watch         - Alias for continuous');
      console.log('  help          - Show this help');
      console.log('');
      break;
    default:
      await cli.run();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { MonitoringCLI, MockMonitoringData };
