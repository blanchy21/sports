import { NextRequest, NextResponse } from 'next/server';
import { getRecentOperations } from '@/lib/hive-workerbee/account';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const limit = parseInt(searchParams.get('limit') || '500');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Fetching transaction history for ${username}, limit: ${limit}`);

    // Fetch recent operations using WorkerBee
    const operations = await getRecentOperations(username, limit);

    if (!operations) {
      return NextResponse.json(
        { error: 'Failed to fetch transaction history' },
        { status: 500 }
      );
    }

    console.log(`[API] Successfully fetched ${operations.length} operations for ${username}`);

    return NextResponse.json({
      success: true,
      operations,
      count: operations.length,
      username
    });

  } catch (error) {
    console.error('[API] Error fetching transaction history:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
