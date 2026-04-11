/**
 * One-off script to sync ESPN Masters scores and update leaderboard.
 * Run with: npx tsx scripts/sync-masters.ts
 */
import 'dotenv/config';
import { prisma } from '../src/lib/db/prisma';
import {
  fetchEspnGolfScores,
  matchGolfersToTeams,
  getGolfScoringState,
  type GolfScoringState,
  type GolferTeamMetadata,
} from '../src/lib/contests/espn-golf';
import { recalculateLeaderboard } from '../src/lib/contests/recalculate';
import { Prisma } from '../src/generated/prisma/client';

function toJsonValue(obj: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue;
}

async function main() {
  const contest = await prisma.contest.findUnique({ where: { slug: 'masters-2026' } });
  if (!contest) throw new Error('Contest not found');

  console.log(`Contest: ${contest.title} (${contest.status})`);

  // 1. Fetch ESPN scores
  console.log('\n--- Fetching ESPN scores ---');
  const espnResult = await fetchEspnGolfScores();
  console.log(`Tournament: ${espnResult.tournamentName}`);
  console.log(`Current round: ${espnResult.currentRound}`);
  console.log(`Golfers fetched: ${espnResult.golfers.length}`);

  // Show top 10
  const sorted = [...espnResult.golfers].sort((a, b) => a.order - b.order);
  console.log('\nTop 10:');
  for (const g of sorted.slice(0, 10)) {
    const r1 = g.rounds[1] ? g.rounds[1].strokes.toString() : '-';
    console.log(`  ${g.order}. ${g.espnName}: ${g.scoreDisplay} (R1: ${r1}) [${g.status}]`);
  }

  // 2. Match to DB teams
  const dbTeams = await prisma.contestTeam.findMany({
    where: { contestId: contest.id },
    select: { code: true, name: true },
  });
  console.log(`\nDB teams: ${dbTeams.length}`);

  const typeConfig = (contest.typeConfig as Record<string, unknown>) || {};
  const scoringState = getGolfScoringState(contest.typeConfig);

  const { matched, unmatched } = matchGolfersToTeams(
    espnResult.golfers,
    dbTeams,
    scoringState.nameOverrides
  );
  console.log(`Matched: ${matched.length}`);
  console.log(`Unmatched: ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log('Unmatched names:', unmatched);
  }

  // 3. Store as draft
  const draftScores = matched.map((m) => m.espnData);
  const updatedScoring: GolfScoringState = {
    ...scoringState,
    draftScores,
    draftFetchedAt: new Date().toISOString(),
    unmatchedNames: unmatched,
  };

  await prisma.contest.update({
    where: { id: contest.id },
    data: { typeConfig: toJsonValue({ ...typeConfig, golfScoring: updatedScoring }) },
  });
  console.log('\nDraft scores saved.');

  // 4. Publish — update ContestTeam metadata
  console.log('\n--- Publishing scores ---');
  let maxRound = 0;
  for (const m of matched) {
    const rounds = Object.keys(m.espnData.rounds).map(Number);
    const highest = Math.max(...rounds, 0);
    if (highest > maxRound) maxRound = highest;
  }

  let teamsUpdated = 0;
  for (const m of matched) {
    const team = await prisma.contestTeam.findFirst({
      where: { contestId: contest.id, code: m.teamCode },
    });
    if (!team) continue;

    const existingMeta = (team.metadata as unknown as GolferTeamMetadata) || { odds: 0 };

    const roundsDisplay: Record<string, string> = {};
    const strokesMap: Record<string, number> = {};
    for (const [rNum, rData] of Object.entries(m.espnData.rounds)) {
      roundsDisplay[rNum] = rData.display;
      strokesMap[rNum] = rData.strokes;
    }

    const updatedMeta: GolferTeamMetadata = {
      ...existingMeta,
      rounds: roundsDisplay,
      strokes: strokesMap,
      scoreRelToPar: m.espnData.scoreRelToPar,
      position: m.espnData.order,
      status: m.espnData.status,
    };

    await prisma.contestTeam.update({
      where: { id: team.id },
      data: { metadata: toJsonValue(updatedMeta) },
    });
    teamsUpdated++;
  }

  // Clear draft after publish
  const publishedScoring: GolfScoringState = {
    ...updatedScoring,
    publishedRound: maxRound,
    draftScores: null,
    draftFetchedAt: null,
  };

  await prisma.contest.update({
    where: { id: contest.id },
    data: { typeConfig: toJsonValue({ ...typeConfig, golfScoring: publishedScoring }) },
  });

  console.log(`Teams updated: ${teamsUpdated}`);
  console.log(`Published round: ${maxRound}`);

  // 5. Recalculate leaderboard
  console.log('\n--- Recalculating leaderboard ---');
  const result = await recalculateLeaderboard(contest.id);
  console.log(`Entries recalculated: ${result.entriesUpdated}`);

  // 6. Show updated leaderboard
  console.log('\n--- LEADERBOARD AFTER ROUND 1 ---');
  const entries = await prisma.contestEntry.findMany({
    where: { contestId: contest.id },
    orderBy: [{ totalScore: 'asc' }, { rank: 'asc' }],
  });

  for (const entry of entries) {
    const data = entry.entryData as {
      picks: Array<{ golferCode: string; odds: number }>;
      tieBreaker: number;
    };
    const picks = data.picks.map((p) => p.golferCode).join(', ');
    console.log(
      `  #${entry.rank} ${entry.username}: ${entry.totalScore} (picks: ${picks}) TB: ${data.tieBreaker}`
    );
  }

  // Also update contest status to ACTIVE if still in REGISTRATION
  if (contest.status === 'REGISTRATION') {
    await prisma.contest.update({
      where: { id: contest.id },
      data: { status: 'ACTIVE' },
    });
    console.log('\nContest status updated: REGISTRATION → ACTIVE');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
