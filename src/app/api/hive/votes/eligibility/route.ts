import { NextRequest, NextResponse } from 'next/server';
import { checkUserVote, canUserVote } from '@/lib/hive-workerbee/voting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/hive/votes/eligibility?author=&permlink=&voter=
 *
 * Returns vote status for a specific post + voting eligibility for the voter.
 * Used by useVoting hook to avoid importing server-only WorkerBee in client components.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const author = searchParams.get('author') ?? '';
  const permlink = searchParams.get('permlink') ?? '';
  const voter = searchParams.get('voter') ?? '';

  if (!author || !permlink || !voter) {
    return NextResponse.json(
      { success: false, error: 'author, permlink, and voter are required' },
      { status: 400 }
    );
  }

  try {
    const [userVote, eligibility] = await Promise.all([
      checkUserVote(author, permlink, voter),
      canUserVote(voter),
    ]);

    return NextResponse.json({ success: true, data: { userVote, eligibility } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check vote status',
      },
      { status: 500 }
    );
  }
}
