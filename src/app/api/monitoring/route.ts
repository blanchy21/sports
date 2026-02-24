import { NextRequest, NextResponse } from 'next/server';
import {
  getMonitoringStats,
  clearMonitoringData,
  exportMonitoringData,
} from '@/lib/hive-workerbee/monitoring';
import {
  getOptimizationMetrics,
  clearOptimizationCache as clearOptCache,
} from '@/lib/hive-workerbee/optimization';
import { getMemoryCache } from '@/lib/cache';
import { getTieredCache } from '@/lib/cache';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { isAdminAccount } from '@/lib/admin/config';
import { createRequestContext } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/monitoring';

export async function GET(request: NextRequest) {
  // Admin-only access
  const user = await getAuthenticatedUserFromSession(request);
  if (!user || !isAdminAccount(user.username)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const ctx = createRequestContext(ROUTE);
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        // Get real monitoring data
        const monitoringStats = getMonitoringStats();
        const optimizationStats = getOptimizationMetrics();

        // Get cache stats
        let cacheStats = {
          size: 0,
          maxSize: 1000,
          hitRate: 0,
          redisAvailable: false,
        };

        try {
          const memoryCache = getMemoryCache();
          const memoryCacheStats = memoryCache.getStats();

          const tieredCache = await getTieredCache();
          const tieredStats = tieredCache.getStats();

          cacheStats = {
            size: memoryCacheStats.size,
            maxSize: memoryCacheStats.maxEntries,
            hitRate: tieredStats.hitRate * 100,
            redisAvailable: tieredCache.isRedisAvailable(),
          };
        } catch {
          // Cache not available, use defaults
        }

        return NextResponse.json({
          monitoring: monitoringStats,
          optimization: optimizationStats,
          cache: cacheStats,
          timestamp: new Date().toISOString(),
        });

      case 'export':
        // Export full monitoring data for analysis
        const exportData = exportMonitoringData();
        const exportOptStats = getOptimizationMetrics();

        return NextResponse.json({
          monitoring: exportData,
          optimization: exportOptStats,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use ?action=stats or ?action=export' },
          { status: 400 }
        );
    }
  } catch (error) {
    return ctx.handleError(error);
  }
}

export async function POST(request: NextRequest) {
  // Admin-only access
  const user = await getAuthenticatedUserFromSession(request);
  if (!user || !isAdminAccount(user.username)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);
    try {
      const { action } = await request.json();

      switch (action) {
        case 'clear':
          await Promise.all([clearMonitoringData(), clearOptCache()]);

          return NextResponse.json({
            success: true,
            message: 'All monitoring data cleared',
          });

        case 'clear-cache':
          await clearOptCache();

          return NextResponse.json({
            success: true,
            message: 'Cache cleared',
          });

        case 'clear-monitoring':
          await clearMonitoringData();

          return NextResponse.json({
            success: true,
            message: 'Monitoring data cleared',
          });

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
