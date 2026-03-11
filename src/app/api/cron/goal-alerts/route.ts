/**
 * Cron endpoint: automated goal alerts for live soccer matches.
 *
 * Runs every 2 minutes. Detects new goals by comparing ESPN match summaries
 * against Redis-stored known goals, then posts a sportsbite to the
 * corresponding match thread on Hive.
 */

import { NextResponse } from 'next/server';
import { Operation } from '@hiveio/dhive';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { fetchAllEvents, fetchEventSummary } from '@/lib/sports/espn';
import { getRedisCache } from '@/lib/cache/redis-cache';
import { broadcastWithKey } from '@/lib/hive-workerbee/broadcast';
import { MATCH_THREAD_CONFIG, getMatchThreadPermlink } from '@/lib/hive-workerbee/match-threads';
import { SPORTS_ARENA_CONFIG, SPORTSBITES_CONFIG } from '@/lib/hive-workerbee/shared';
import { error as logError, info as logInfo } from '@/lib/hive-workerbee/logger';
import type { SportsEvent, MatchEvent } from '@/types/sports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REDIS_KEY_PREFIX = 'goals:';
const GOAL_TTL_SECONDS = 86400; // 24 hours

// ---------------------------------------------------------------------------
// Goal deduplication helpers
// ---------------------------------------------------------------------------

/** Build a deterministic key for a single goal event. */
function buildGoalKey(goal: MatchEvent): string {
  return `${goal.playerName}:${goal.clock}:${goal.team}`;
}

/** Fetch the set of already-posted goal keys for an event from Redis. */
async function getKnownGoals(eventId: string): Promise<Set<string>> {
  try {
    const redis = await getRedisCache();
    if (!redis.isAvailable()) return new Set();

    const stored = await redis.get<string[]>(`${REDIS_KEY_PREFIX}${eventId}`);
    return new Set(stored ?? []);
  } catch {
    return new Set();
  }
}

/** Persist updated goal keys to Redis. */
async function saveKnownGoals(eventId: string, goalKeys: string[]): Promise<void> {
  try {
    const redis = await getRedisCache();
    if (!redis.isAvailable()) return;

    await redis.set(`${REDIS_KEY_PREFIX}${eventId}`, goalKeys, { ttl: GOAL_TTL_SECONDS });
  } catch (err) {
    logError(
      `Failed to save known goals for event ${eventId}`,
      'GoalAlerts',
      err instanceof Error ? err : undefined
    );
  }
}

// ---------------------------------------------------------------------------
// Alert text builder
// ---------------------------------------------------------------------------

function buildGoalAlertBody(goal: MatchEvent, event: SportsEvent): string {
  const suffix = goal.isPenalty ? ' (pen)' : goal.isOwnGoal ? ' (OG)' : '';
  const scoreLine =
    event.teams && event.score
      ? ` | ${event.teams.home} ${event.score.home}-${event.score.away} ${event.teams.away}`
      : '';

  return `\u26BD GOAL! ${goal.playerName} (${goal.teamName})${suffix} ${goal.clock}${scoreLine}`;
}

// ---------------------------------------------------------------------------
// Broadcast a single goal alert
// ---------------------------------------------------------------------------

async function postGoalAlert(
  goal: MatchEvent,
  event: SportsEvent,
  postingKey: string
): Promise<{ success: boolean; txId?: string; error?: string }> {
  const eventId = event.id;
  const permlink = `goal-alert-${eventId}-${Date.now()}`;
  const body = buildGoalAlertBody(goal, event);

  const jsonMetadata = JSON.stringify({
    app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
    format: 'markdown',
    tags: ['sportsblock', 'goal-alert', 'sportsbites', 'hive-115814'],
    content_type: SPORTSBITES_CONFIG.CONTENT_TYPE,
    goal_alert: {
      eventId,
      playerName: goal.playerName,
      clock: goal.clock,
      team: goal.team,
    },
  });

  const operation: Operation = [
    'comment',
    {
      parent_author: MATCH_THREAD_CONFIG.PARENT_AUTHOR,
      parent_permlink: getMatchThreadPermlink(eventId),
      author: MATCH_THREAD_CONFIG.PARENT_AUTHOR,
      permlink,
      title: '',
      body,
      json_metadata: jsonMetadata,
    },
  ];

  const result = await broadcastWithKey([operation], postingKey);

  if (result.success) {
    logInfo(
      `Posted goal alert: ${goal.playerName} (${goal.teamName}) ${goal.clock} for event ${eventId} — tx=${result.transactionId}`,
      'GoalAlerts'
    );
    return { success: true, txId: result.transactionId };
  }

  logError(`Failed to post goal alert for event ${eventId}: ${result.error}`, 'GoalAlerts');
  return { success: false, error: result.error };
}

// ---------------------------------------------------------------------------
// Process a single live event
// ---------------------------------------------------------------------------

async function processLiveEvent(
  event: SportsEvent,
  postingKey: string
): Promise<{ eventId: string; newGoals: number; errors: number }> {
  const eventId = event.id;

  // Fetch match detail from ESPN
  const detail = await fetchEventSummary(
    event.espnSport ?? 'soccer',
    event.leagueSlug ?? '',
    eventId,
    true
  );

  if (!detail) {
    return { eventId, newGoals: 0, errors: 0 };
  }

  // Filter to goal events only
  const goals = detail.events.filter((e) => e.type === 'goal');
  if (goals.length === 0) {
    return { eventId, newGoals: 0, errors: 0 };
  }

  // Determine which goals are new
  const knownGoals = await getKnownGoals(eventId);
  const newGoals = goals.filter((g) => !knownGoals.has(buildGoalKey(g)));

  if (newGoals.length === 0) {
    return { eventId, newGoals: 0, errors: 0 };
  }

  let posted = 0;
  let errors = 0;

  // Collect all goal keys (existing + new) for saving later
  const allGoalKeys = [...knownGoals];

  for (const goal of newGoals) {
    const goalKey = buildGoalKey(goal);

    try {
      const result = await postGoalAlert(goal, event, postingKey);
      if (result.success) {
        posted++;
      } else {
        errors++;
      }
    } catch (err) {
      errors++;
      logError(
        `Exception posting goal alert for event ${eventId}`,
        'GoalAlerts',
        err instanceof Error ? err : undefined
      );
    }

    // Mark as known regardless of broadcast success to avoid spam retries
    allGoalKeys.push(goalKey);
  }

  // Persist updated goal keys
  await saveKnownGoals(eventId, allGoalKeys);

  return { eventId, newGoals: posted, errors };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function GET() {
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  const postingKey = process.env.SPORTSBITES_POSTING_KEY;
  if (!postingKey) {
    logError('SPORTSBITES_POSTING_KEY not configured', 'GoalAlerts');
    return NextResponse.json(
      { success: false, error: 'SPORTSBITES_POSTING_KEY not configured' },
      { status: 503 }
    );
  }

  // Verify Redis availability (warn but don't crash)
  const redis = await getRedisCache();
  if (!redis.isAvailable()) {
    logError(
      'Redis not available — goal deduplication disabled, skipping to avoid duplicates',
      'GoalAlerts'
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Redis unavailable — cannot deduplicate goals safely',
        liveEvents: 0,
        goalsPosted: 0,
      },
      { status: 503 }
    );
  }

  try {
    logInfo('Checking for new goals in live soccer matches...', 'GoalAlerts');

    const { events } = await fetchAllEvents();

    // Filter to live soccer events only
    const liveSoccerEvents = events.filter((e) => e.status === 'live' && e.espnSport === 'soccer');

    if (liveSoccerEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No live soccer events',
        liveEvents: 0,
        goalsPosted: 0,
      });
    }

    logInfo(`Processing ${liveSoccerEvents.length} live soccer event(s)`, 'GoalAlerts');

    let totalGoalsPosted = 0;
    let totalErrors = 0;
    const results: { eventId: string; newGoals: number; errors: number }[] = [];

    for (const event of liveSoccerEvents) {
      try {
        const result = await processLiveEvent(event, postingKey);
        results.push(result);
        totalGoalsPosted += result.newGoals;
        totalErrors += result.errors;
      } catch (err) {
        logError(
          `Failed to process event ${event.id}`,
          'GoalAlerts',
          err instanceof Error ? err : undefined
        );
        results.push({ eventId: event.id, newGoals: 0, errors: 1 });
        totalErrors++;
      }
    }

    logInfo(
      `Goal alerts complete: ${liveSoccerEvents.length} events, ${totalGoalsPosted} goals posted, ${totalErrors} errors`,
      'GoalAlerts'
    );

    return NextResponse.json({
      success: true,
      liveEvents: liveSoccerEvents.length,
      goalsPosted: totalGoalsPosted,
      errors: totalErrors,
      results,
    });
  } catch (err) {
    logError('Goal alerts cron failed', 'GoalAlerts', err instanceof Error ? err : undefined);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
