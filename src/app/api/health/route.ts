import { NextResponse } from 'next/server';
import { getTieredCache } from '@/lib/cache';
import { isRedisConfigured } from '@/lib/cache/redis-cache';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    service: CheckResult;
    redis: CheckResult;
    hive: CheckResult;
  };
  uptime: number;
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  latency?: number;
}

const startTime = Date.now();

/**
 * Health check endpoint
 * Returns overall health status and individual component checks
 */
export async function GET() {
  const checks = {
    service: await checkService(),
    redis: await checkRedis(),
    hive: await checkHive(),
  };

  // Determine overall status
  const failedChecks = Object.values(checks).filter(c => c.status === 'fail');
  const warnChecks = Object.values(checks).filter(c => c.status === 'warn');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (failedChecks.length > 0) {
    // Hive failure is critical, others degrade
    if (checks.hive.status === 'fail') {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }
  } else if (warnChecks.length > 0) {
    overallStatus = 'degraded';
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks,
    uptime: Date.now() - startTime,
  };

  // Return 200 for healthy/degraded, 503 for unhealthy
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(healthStatus, { status: httpStatus });
}

/**
 * Check basic service health
 */
async function checkService(): Promise<CheckResult> {
  try {
    // Basic service check - if we got here, service is running
    return {
      status: 'pass',
      message: 'Service is running',
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Service check failed',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<CheckResult> {
  if (!isRedisConfigured()) {
    return {
      status: 'warn',
      message: 'Redis not configured (using in-memory cache)',
    };
  }

  const startTime = Date.now();

  try {
    const cache = await getTieredCache();
    const isAvailable = cache.isRedisAvailable();
    const latency = Date.now() - startTime;

    if (isAvailable) {
      return {
        status: 'pass',
        message: 'Redis connected',
        latency,
      };
    } else {
      return {
        status: 'warn',
        message: 'Redis configured but not connected',
        latency,
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Redis check failed',
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Create an abort signal with timeout
 * Compatible with older Node.js versions
 */
function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * Check Hive API connectivity
 */
async function checkHive(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    // Simple check - fetch global properties
    const response = await fetch('https://api.hive.blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_dynamic_global_properties',
        params: [],
        id: 1,
      }),
      signal: createTimeoutSignal(5000), // 5 second timeout
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: 'fail',
        message: `Hive API returned ${response.status}`,
        latency,
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        status: 'fail',
        message: data.error.message || 'Hive API error',
        latency,
      };
    }

    // Check if we got valid data
    if (data.result && data.result.head_block_number) {
      return {
        status: 'pass',
        message: `Hive connected (block ${data.result.head_block_number})`,
        latency,
      };
    }

    return {
      status: 'warn',
      message: 'Hive API returned unexpected response',
      latency,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Hive check failed',
      latency: Date.now() - startTime,
    };
  }
}
