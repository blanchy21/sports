import { NextResponse } from 'next/server';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { delegateRcToUser } from '@/lib/hive/account-creation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH_SIZE = 20;

/**
 * Cron endpoint for retrying failed RC delegations.
 *
 * Runs every 6 hours. Finds custodial users who have a Hive account
 * but never received RC delegation, and attempts to delegate.
 */
export async function GET() {
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  logger.info('Starting RC delegation retry', 'cron:retry-rc-delegation');

  const results = {
    checked: 0,
    delegated: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const users = await prisma.custodialUser.findMany({
      where: {
        hiveUsername: { not: null },
        rcDelegatedAt: null,
        isGraduated: false,
      },
      select: {
        id: true,
        hiveUsername: true,
      },
      take: BATCH_SIZE,
    });

    if (users.length === 0) {
      logger.info('No accounts need RC delegation', 'cron:retry-rc-delegation');
      return NextResponse.json({
        success: true,
        message: 'No accounts need RC delegation',
        results,
      });
    }

    logger.info(`Retrying RC delegation for ${users.length} accounts`, 'cron:retry-rc-delegation');

    for (const user of users) {
      results.checked++;

      try {
        await delegateRcToUser(user.hiveUsername!);

        await prisma.custodialUser.update({
          where: { id: user.id },
          data: { rcDelegatedAt: new Date() },
        });

        results.delegated++;
        logger.info(`RC delegated to @${user.hiveUsername}`, 'cron:retry-rc-delegation');
      } catch (error) {
        results.failed++;
        const message = error instanceof Error ? error.message : String(error);
        results.errors.push(`@${user.hiveUsername}: ${message}`);
        logger.warn(`RC delegation to @${user.hiveUsername} failed`, 'cron:retry-rc-delegation', {
          error: message,
        });
      }
    }

    logger.info('RC delegation retry completed', 'cron:retry-rc-delegation', results);

    return NextResponse.json({
      success: true,
      message: 'RC delegation retry completed',
      results,
    });
  } catch (error) {
    logger.error('RC delegation retry failed', 'cron:retry-rc-delegation', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: message,
        partialResults: results,
      },
      { status: 500 }
    );
  }
}
