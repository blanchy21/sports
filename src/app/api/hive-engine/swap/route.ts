/**
 * MEDALS Swap Quote API Route
 *
 * GET /api/hive-engine/swap?amount=X
 *   Returns a swap quote: estimated MEDALS output, price impact, order book depth
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/api/response';
import { getSwapQuote } from '@/lib/hive-engine/swap';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive-engine/swap';

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);
  try {
    const { searchParams } = new URL(request.url);
    const amountStr = searchParams.get('amount');

    if (!amountStr) {
      return NextResponse.json({ error: 'amount parameter is required' }, { status: 400 });
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const quote = await getSwapQuote(amount);

    return NextResponse.json(
      {
        hiveAmount: quote.hiveAmount.toFixed(3),
        fee: quote.fee.toFixed(3),
        netHive: quote.netHive.toFixed(3),
        estimatedMedals: quote.estimatedMedals.toFixed(8),
        averagePrice: quote.averagePrice.toFixed(8),
        worstPrice: quote.worstPrice.toFixed(8),
        priceImpact: quote.priceImpact.toFixed(2),
        sufficient: quote.sufficient,
        ordersMatched: quote.ordersMatched,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
