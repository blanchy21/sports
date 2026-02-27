/**
 * One-off admin endpoint to void/refund a specific prediction.
 * Uses CRON_SECRET for auth (no CSRF needed).
 * DELETE THIS FILE after use.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { executeVoidRefund } from '@/lib/predictions/settlement';

export async function POST(request: NextRequest) {
  const authorized = await verifyCronRequest();
  if (!authorized) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  try {
    const { predictionId, reason } = await request.json();
    if (!predictionId || !reason) {
      return NextResponse.json({ error: 'predictionId and reason required' }, { status: 400 });
    }

    await executeVoidRefund(predictionId, reason, 'admin');
    return NextResponse.json({ success: true, message: 'Prediction voided and refunded' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
