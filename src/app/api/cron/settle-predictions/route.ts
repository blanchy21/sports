import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { fetchEventsByIds } from '@/lib/sports/espn';
import { resolveWinningOutcome } from '@/lib/predictions/auto-settle';
import { executeSettlement } from '@/lib/predictions/settlement';
import { NextResponse } from 'next/server';

export async function GET() {
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  // Find all LOCKED predictions that have a matchReference (ESPN event ID)
  const predictions = await prisma.prediction.findMany({
    where: {
      status: 'LOCKED',
      matchReference: { not: null },
    },
    include: {
      outcomes: { select: { id: true, label: true } },
    },
  });

  if (predictions.length === 0) {
    return NextResponse.json({ success: true, settled: 0, skipped: 0, errors: 0 });
  }

  // Fetch ESPN events for all referenced match IDs
  const eventIds = [...new Set(predictions.map((p) => p.matchReference!))];
  const eventsMap = await fetchEventsByIds(eventIds);

  let settled = 0;
  let skipped = 0;
  let errors = 0;

  for (const prediction of predictions) {
    const event = eventsMap.get(prediction.matchReference!);

    // Event not found in ESPN data or not finished yet
    if (!event || event.status !== 'finished') {
      skipped++;
      continue;
    }

    const winningOutcomeId = resolveWinningOutcome(event, prediction.outcomes);

    if (!winningOutcomeId) {
      logger.info(
        `Cannot auto-resolve prediction ${prediction.id} ("${prediction.title}") — manual settlement required`,
        'cron/settle-predictions',
        {
          matchReference: prediction.matchReference,
          outcomes: prediction.outcomes.map((o) => o.label),
        }
      );
      skipped++;
      continue;
    }

    try {
      await executeSettlement(prediction.id, winningOutcomeId, 'auto-settlement');
      settled++;
      logger.info(
        `Auto-settled prediction ${prediction.id} ("${prediction.title}")`,
        'cron/settle-predictions',
        { winningOutcomeId, matchReference: prediction.matchReference }
      );
    } catch (error) {
      errors++;
      logger.error(
        `Failed to auto-settle prediction ${prediction.id}`,
        'cron/settle-predictions',
        error
      );
    }
  }

  logger.info(
    `Auto-settlement complete: ${settled} settled, ${skipped} skipped, ${errors} errors`,
    'cron/settle-predictions'
  );

  return NextResponse.json({ success: true, settled, skipped, errors });
}
