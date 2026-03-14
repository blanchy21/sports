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

const REDIS_KEY_PREFIX = 'goal:';
const GOAL_TTL_SECONDS = 86400; // 24 hours

// ---------------------------------------------------------------------------
// Goal deduplication helpers
//
// Uses per-goal Redis keys (goal:{eventId}:{goalKey}) with a write-ahead
// pattern: we mark a goal as known BEFORE posting, so even if a later step
// fails (broadcast, save), the next cron cycle won't re-post it.
//
// As a second safety layer, permlinks are deterministic (based on the goal
// key), so Hive itself will reject/update duplicate comments even if Redis
// dedup fails entirely.
// ---------------------------------------------------------------------------

/** Normalise clock to base minutes only (e.g. "45'+2" → "45") so that
 *  ESPN added-time formatting changes don't generate duplicate keys.
 */
function normaliseMinute(clock: string): string {
  const m = clock.match(/^(\d+)/);
  return m ? m[1] : clock;
}

function buildGoalKey(goal: MatchEvent): string {
  return `${goal.playerName}:${normaliseMinute(goal.clock)}:${goal.team}`;
}

/** Build a deterministic, Hive-safe permlink slug from a goal key. */
function buildGoalPermlink(eventId: string, goalKey: string): string {
  const slug = goalKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `goal-alert-${eventId}-${slug}`;
}

/** Check if a single goal has already been recorded in Redis.
 *  Returns `true` (known), `false` (new), or `null` (Redis unavailable — skip).
 */
async function isGoalKnown(eventId: string, goalKey: string): Promise<boolean | null> {
  try {
    const redis = await getRedisCache();
    if (!redis.isAvailable()) return null;

    const result = await redis.get<string>(`${REDIS_KEY_PREFIX}${eventId}:${goalKey}`);
    return result !== null;
  } catch (err) {
    logError(
      `Failed to check goal key ${goalKey} for event ${eventId}`,
      'GoalAlerts',
      err instanceof Error ? err : undefined
    );
    return null;
  }
}

/** Mark a single goal as known in Redis BEFORE posting (write-ahead).
 *  Returns `true` if the write succeeded — callers MUST skip posting on `false`.
 */
async function markGoalKnown(eventId: string, goalKey: string): Promise<boolean> {
  try {
    const redis = await getRedisCache();
    if (!redis.isAvailable()) return false;

    const saved = await redis.set(`${REDIS_KEY_PREFIX}${eventId}:${goalKey}`, '1', {
      ttl: GOAL_TTL_SECONDS,
    });
    return saved;
  } catch (err) {
    logError(
      `Failed to persist goal key ${goalKey} for event ${eventId}`,
      'GoalAlerts',
      err instanceof Error ? err : undefined
    );
    return false;
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
  postingKey: string,
  goalKey: string
): Promise<{ success: boolean; txId?: string; error?: string }> {
  const eventId = event.id;
  // Deterministic permlink — Hive rejects/updates duplicates as a safety net
  const permlink = buildGoalPermlink(eventId, goalKey);
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

  let posted = 0;
  let errors = 0;

  for (const goal of goals) {
    const goalKey = buildGoalKey(goal);

    // Check if this goal is already known
    const known = await isGoalKnown(eventId, goalKey);

    // Redis unavailable — skip entirely to avoid duplicates
    if (known === null) {
      logError(`Skipping goal ${goalKey} for event ${eventId} — Redis check failed`, 'GoalAlerts');
      errors++;
      continue;
    }

    // Already posted
    if (known) continue;

    // Write-ahead: mark as known BEFORE posting so the next cron cycle
    // won't re-post even if this invocation crashes after broadcast.
    const saved = await markGoalKnown(eventId, goalKey);
    if (!saved) {
      logError(
        `Skipping goal ${goalKey} for event ${eventId} — could not persist dedup key`,
        'GoalAlerts'
      );
      errors++;
      continue;
    }

    // Safe to post — dedup key is persisted
    try {
      const result = await postGoalAlert(goal, event, postingKey, goalKey);
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
  }

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

  // Verify Redis is ACTUALLY working (not just "connected") with a canary write/read.
  // The previous isAvailable() check only tested the initial PING — it didn't catch
  // intermittent failures where PING succeeded but GET/SET silently failed.
  const redis = await getRedisCache();
  if (!redis.isAvailable()) {
    logError('Redis not available — skipping to avoid duplicate goal alerts', 'GoalAlerts');
    return NextResponse.json(
      { success: false, error: 'Redis unavailable', liveEvents: 0, goalsPosted: 0 },
      { status: 503 }
    );
  }

  // Canary test: verify GET/SET actually work, not just PING
  const canaryKey = 'goal-alerts:canary';
  const canaryValue = Date.now().toString();
  const canaryWritten = await redis.set(canaryKey, canaryValue, { ttl: 120 });
  if (!canaryWritten) {
    logError('Redis canary write failed — skipping to avoid duplicate goal alerts', 'GoalAlerts');
    return NextResponse.json(
      { success: false, error: 'Redis write test failed', liveEvents: 0, goalsPosted: 0 },
      { status: 503 }
    );
  }
  const canaryRead = await redis.get<string>(canaryKey);
  if (canaryRead !== canaryValue) {
    logError(
      `Redis canary read-back failed (wrote "${canaryValue}", got "${canaryRead}") — skipping`,
      'GoalAlerts'
    );
    return NextResponse.json(
      { success: false, error: 'Redis read-back test failed', liveEvents: 0, goalsPosted: 0 },
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
