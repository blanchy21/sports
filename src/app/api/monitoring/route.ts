import { NextRequest, NextResponse } from 'next/server';
import { clearMonitoringData } from '@/lib/hive-workerbee/monitoring';
import { clearOptimizationCache as clearOptCache } from '@/lib/hive-workerbee/optimization';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        // Return mock data for now to avoid errors
        const mockData = {
          monitoring: {
            errors: {
              total: 0,
              unresolved: 0,
              byType: {},
              bySeverity: {},
              recentErrors: []
            },
            performance: {
              totalOperations: 0,
              averageDuration: 0,
              successRate: 100,
              slowOperations: [],
              recentPerformance: []
            },
            health: {
              status: 'healthy',
              issues: [],
              recommendations: []
            }
          },
          optimization: {
            requestCount: 0,
            averageResponseTime: 0,
            cacheHitRate: 0,
            errorRate: 0,
            lastUpdated: Date.now()
          },
          cache: {
            size: 0,
            maxSize: 1000,
            hitRate: 0
          },
          timestamp: new Date().toISOString()
        };
        
        return NextResponse.json(mockData);

      case 'export':
        return NextResponse.json({
          monitoring: {},
          optimization: {},
          cache: {},
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in monitoring API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'clear':
        await Promise.all([
          clearMonitoringData(),
          clearOptCache()
        ]);
        
        return NextResponse.json({ 
          success: true, 
          message: 'All monitoring data cleared' 
        });

      case 'clear-cache':
        await clearOptCache();
        
        return NextResponse.json({ 
          success: true, 
          message: 'Cache cleared' 
        });

      case 'clear-monitoring':
        await clearMonitoringData();
        
        return NextResponse.json({ 
          success: true, 
          message: 'Monitoring data cleared' 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in monitoring API POST:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
