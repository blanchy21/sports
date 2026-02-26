import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function GET() {
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  const result = await prisma.prediction.updateMany({
    where: {
      status: 'OPEN',
      locksAt: { lte: new Date() },
    },
    data: { status: 'LOCKED' },
  });

  logger.info(
    `Locked ${result.count} prediction(s) that passed their lock time`,
    'cron/lock-predictions'
  );

  return NextResponse.json({
    success: true,
    locked: result.count,
  });
}
