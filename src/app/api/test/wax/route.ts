import { NextRequest, NextResponse } from 'next/server';
import { makeWaxApiCall } from '@/lib/hive-workerbee/api';
import { getAccountWax, getContentWax, getDiscussionsWax } from '@/lib/hive-workerbee/wax-helpers';
import { getWaxClient, checkWaxHealth } from '@/lib/hive-workerbee/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get('type') || 'all';
  const username = searchParams.get('username') || 'blanchy';

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    // Test 1: Wax Client Initialization
    if (testType === 'all' || testType === 'init') {
      try {
        const wax = await getWaxClient();
        results.tests = {
          ...results.tests,
          initialization: {
            success: true,
            message: 'Wax client initialized successfully',
            hasWax: !!wax
          }
        };
      } catch (error) {
        results.tests = {
          ...results.tests,
          initialization: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            isRequestInterceptor: error instanceof Error && error.message.includes('requestInterceptor')
          }
        };
      }
    }

    // Test 2: Wax Health Check
    if (testType === 'all' || testType === 'health') {
      try {
        const health = await checkWaxHealth();
        results.tests = {
          ...results.tests,
          health: {
            success: true,
            isHealthy: health.isHealthy,
            latency: health.latency,
            error: health.error
          }
        };
      } catch (error) {
        results.tests = {
          ...results.tests,
          health: {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
        };
      }
    }

    // Test 3: Get Account via Wax
    if (testType === 'all' || testType === 'account') {
      try {
        const account = await getAccountWax(username);
        results.tests = {
          ...results.tests,
          getAccount: {
            success: !!account,
            hasAccount: !!account,
            accountName: account ? (account as Record<string, unknown>).name : null
          }
        };
      } catch (error) {
        results.tests = {
          ...results.tests,
          getAccount: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            isRequestInterceptor: error instanceof Error && error.message.includes('requestInterceptor')
          }
        };
      }
    }

    // Test 4: Make Wax API Call (generic)
    if (testType === 'all' || testType === 'api') {
      try {
        const result = await makeWaxApiCall('get_dynamic_global_properties', []);
        results.tests = {
          ...results.tests,
          makeWaxApiCall: {
            success: true,
            hasResult: !!result,
            headBlock: result ? (result as Record<string, unknown>).head_block_number : null
          }
        };
      } catch (error) {
        results.tests = {
          ...results.tests,
          makeWaxApiCall: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            isRequestInterceptor: error instanceof Error && error.message.includes('requestInterceptor')
          }
        };
      }
    }

    // Test 5: Get Discussions via Wax
    if (testType === 'all' || testType === 'discussions') {
      try {
        const discussions = await getDiscussionsWax('get_discussions_by_created', [
          {
            tag: 'sportsblock',
            limit: 3,
            start_author: '',
            start_permlink: ''
          }
        ]);
        results.tests = {
          ...results.tests,
          getDiscussions: {
            success: true,
            count: discussions.length,
            hasResults: discussions.length > 0
          }
        };
      } catch (error) {
        results.tests = {
          ...results.tests,
          getDiscussions: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            isRequestInterceptor: error instanceof Error && error.message.includes('requestInterceptor')
          }
        };
      }
    }

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      ...results
    }, { status: 500 });
  }
}

