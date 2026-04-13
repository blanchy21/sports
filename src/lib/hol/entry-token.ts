/**
 * HoL entry token — HMAC-SHA256 signed, time-limited.
 * One token per (competition, user) pair; consumed via Redis on confirm.
 * Mirrors src/lib/contests/entry-token.ts.
 */

import crypto from 'crypto';
import { getRedisCache } from '@/lib/cache/redis-cache';
import { logger } from '@/lib/logger';

const TOKEN_TTL_SECONDS = 600; // 10 min
const DEV_FALLBACK_SECRET = 'dev-only-hol-token-secret-do-not-use-in-prod';

export interface HolTokenData {
  competitionId: string;
  username: string;
  amount: number;
  kind: 'entry' | 'buyback';
  /** For buyback tokens: the entry being revived + which round they're returning to */
  entryId?: string;
  roundNumber?: number;
}

function getSecret(): string {
  const secret =
    process.env.STAKE_TOKEN_SECRET ||
    process.env.SESSION_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw new Error('STAKE_TOKEN_SECRET or SESSION_ENCRYPTION_KEY is required in production');
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}

export function signHolToken(data: HolTokenData): string {
  const exp = Date.now() + TOKEN_TTL_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ ...data, exp })).toString('base64');
  const signature = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function verifyHolToken(token: string): HolTokenData | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;

  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    if (typeof decoded.exp !== 'number' || decoded.exp <= Date.now()) return null;
    if (
      typeof decoded.competitionId !== 'string' ||
      typeof decoded.username !== 'string' ||
      typeof decoded.amount !== 'number' ||
      (decoded.kind !== 'entry' && decoded.kind !== 'buyback')
    ) {
      return null;
    }
    return {
      competitionId: decoded.competitionId,
      username: decoded.username,
      amount: decoded.amount,
      kind: decoded.kind,
      entryId: typeof decoded.entryId === 'string' ? decoded.entryId : undefined,
      roundNumber: typeof decoded.roundNumber === 'number' ? decoded.roundNumber : undefined,
    };
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function consumeHolToken(
  token: string,
  meta: { txId: string; username: string }
): Promise<boolean> {
  try {
    const redis = await getRedisCache();
    if (!redis.isAvailable()) return true; // soft-pass when redis is down
    const key = `hol-token:consumed:${hashToken(token)}`;
    const ok = await redis.setIfAbsent(
      key,
      JSON.stringify({ ...meta, at: Date.now() }),
      TOKEN_TTL_SECONDS
    );
    return ok;
  } catch (error) {
    logger.warn('Redis unavailable for HoL token consumption', 'hol', {
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}
