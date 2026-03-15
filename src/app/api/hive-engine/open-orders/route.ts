/**
 * Open Orders API Route
 *
 * GET /api/hive-engine/open-orders?account=X&symbol=MEDALS
 *   Returns the user's open buy orders for a token on Hive Engine.
 *   Used to verify whether a swap order actually filled.
 */

import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/response';
import { getUserOpenBuyOrders } from '@/lib/hive-engine/market';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive-engine/open-orders';

export const GET = createApiHandler(ROUTE, async (request) => {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get('account');
  const symbol = searchParams.get('symbol') || 'MEDALS';

  if (!account) {
    return NextResponse.json({ error: 'account parameter is required' }, { status: 400 });
  }

  const orders = await getUserOpenBuyOrders(account, symbol);

  return NextResponse.json(
    {
      account,
      symbol,
      openOrders: orders.map((o) => ({
        price: o.price,
        quantity: o.quantity,
        timestamp: o.timestamp,
        txId: o.txId,
      })),
      count: orders.length,
    },
    {
      headers: { 'Cache-Control': 'no-cache' },
    }
  );
});
