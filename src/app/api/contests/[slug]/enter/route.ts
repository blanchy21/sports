/**
 * POST /api/contests/[slug]/enter — Request entry (builds op + signs token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { AuthError, ValidationError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import { validateWorldCupEntry, validateGolfFantasyEntry } from '@/lib/contests/validation';
import { buildEntryFeeOp } from '@/lib/contests/escrow';
import { signEntryToken } from '@/lib/contests/entry-token';
import { CONTEST_TYPES } from '@/lib/contests/constants';

export const POST = createApiHandler('/api/contests/[slug]/enter', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError('Authentication required');

    const url = new URL(request.url);
    const slug = url.pathname.split('/api/contests/')[1]?.split('/')[0];

    const contest = await prisma.contest.findUnique({
      where: { slug },
      include: { teams: true },
    });

    if (!contest) throw new ValidationError('Contest not found');

    // Check contest is open for registration
    if (contest.status !== 'REGISTRATION') {
      throw new ValidationError('Contest is not open for registration');
    }

    const now = new Date();
    if (now < contest.registrationOpens) {
      throw new ValidationError('Registration has not opened yet');
    }
    if (now > contest.registrationCloses) {
      throw new ValidationError('Registration has closed');
    }

    // Check max entries
    if (contest.maxEntries && contest.entryCount >= contest.maxEntries) {
      throw new ValidationError('Contest is full');
    }

    // Check user hasn't already entered
    const existing = await prisma.contestEntry.findUnique({
      where: { contestId_username: { contestId: contest.id, username: user.username } },
    });
    if (existing) {
      throw new ValidationError('You have already entered this contest');
    }

    // Validate entry data based on contest type
    const body = await request.json();
    const { entryData } = body;

    if (contest.contestType === CONTEST_TYPES.WORLD_CUP_FANTASY) {
      const validTeamCodes = new Set(contest.teams.map((t) => t.code));
      const teamPotMap = new Map(contest.teams.map((t) => [t.code, t.pot]));

      const validation = validateWorldCupEntry(entryData, validTeamCodes, teamPotMap);
      if (!validation.valid) {
        throw new ValidationError(validation.error || 'Invalid entry data');
      }
    } else if (contest.contestType === CONTEST_TYPES.GOLF_FANTASY) {
      const validCodes = new Set(contest.teams.map((t) => t.code));
      const oddsMap = new Map(
        contest.teams.map((t) => {
          const meta = t.metadata as Record<string, unknown> | null;
          return [t.code, meta?.odds != null ? Number(meta.odds) : 0];
        })
      );

      const validation = validateGolfFantasyEntry(entryData, validCodes, oddsMap);
      if (!validation.valid) {
        throw new ValidationError(validation.error || 'Invalid entry data');
      }
    } else {
      throw new ValidationError(`Unsupported contest type: ${contest.contestType}`);
    }

    // Build the MEDALS transfer operation
    const entryFee = Number(contest.entryFee);
    const operation = buildEntryFeeOp(user.username, entryFee, contest.id);

    // Sign entry token
    const entryToken = signEntryToken({
      contestId: contest.id,
      username: user.username,
      amount: entryFee,
    });

    ctx.log.info('Contest entry initiated', {
      contestId: contest.id,
      username: user.username,
      entryFee,
    });

    return NextResponse.json({
      success: true,
      data: {
        operation,
        entryToken,
        entryData,
        contestId: contest.id,
        entryFee,
      },
    });
  });
});
