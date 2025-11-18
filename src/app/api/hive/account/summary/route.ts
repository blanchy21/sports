import { NextRequest, NextResponse } from 'next/server';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';
import { retryWithBackoff } from '@/lib/utils/api-retry';

function serializeAccount(account: unknown) {
  if (!account || typeof account !== 'object') {
    return account;
  }

  const safeAccount: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(account)) {
    if (value instanceof Date) {
      safeAccount[key] = value.toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      safeAccount[key] = serializeAccount(value);
    } else if (Array.isArray(value)) {
      safeAccount[key] = value.map((item) =>
        item && typeof item === 'object' ? serializeAccount(item) : item
      );
    } else {
      safeAccount[key] = value;
    }
  }

  return safeAccount;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { success: false, error: 'Username query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const account = await retryWithBackoff(
      () => fetchUserAccount(username),
      {
        maxRetries: 2,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    );

    if (!account) {
      return NextResponse.json(
        { success: false, error: `Account ${username} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      account: serializeAccount(account),
    });
  } catch (error) {
    console.error('[API] Failed to fetch Hive account summary:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown Hive account error';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 502 }
    );
  }
}

