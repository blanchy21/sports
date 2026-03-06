/**
 * Contest Entry Token — HMAC-SHA256 signed, time-limited, one-time-use.
 * Mirrors predictions/stake-token.ts.
 */

import crypto from 'crypto';
import { CONTEST_CONFIG } from './constants';
import { getRedisCache } from '@/lib/cache/redis-cache';
import { logger } from '@/lib/logger';
import type { ContestEntryTokenData } from './types';

const DEV_FALLBACK_SECRET = 'dev-only-contest-entry-token-secret-do-not-use-in-prod';

function getEntryTokenSecret(): string {
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

export function signEntryToken(data: ContestEntryTokenData): string {
  const secret = getEntryTokenSecret();
  const exp = Date.now() + CONTEST_CONFIG.ENTRY_TOKEN_EXPIRY_SECONDS * 1000;

  const payload = Buffer.from(
    JSON.stringify({
      contestId: data.contestId,
      username: data.username,
      amount: data.amount,
      exp,
    })
  ).toString('base64');

  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return `${payload}.${signature}`;
}

export function verifyEntryToken(token: string): ContestEntryTokenData | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const secret = getEntryTokenSecret();

  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));

    if (typeof decoded.exp !== 'number' || decoded.exp <= Date.now()) {
      return null;
    }

    if (
      typeof decoded.contestId !== 'string' ||
      typeof decoded.username !== 'string' ||
      typeof decoded.amount !== 'number'
    ) {
      return null;
    }

    return {
      contestId: decoded.contestId,
      username: decoded.username,
      amount: decoded.amount,
    };
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function isEntryTokenConsumed(token: string): Promise<boolean> {
  try {
    const redis = await getRedisCache();
    if (!redis.isAvailable()) return false;
    return redis.has(`contest-entry-token:consumed:${hashToken(token)}`);
  } catch (error) {
    logger.warn('Redis unavailable for entry token check', 'contests', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function consumeEntryToken(
  token: string,
  meta: { txId: string; username: string }
): Promise<void> {
  try {
    const redis = await getRedisCache();
    if (!redis.isAvailable()) return;
    await redis.set(
      `contest-entry-token:consumed:${hashToken(token)}`,
      { ...meta, consumedAt: Date.now() },
      { ttl: CONTEST_CONFIG.ENTRY_TOKEN_EXPIRY_SECONDS }
    );
  } catch (error) {
    logger.warn('Redis unavailable for entry token consumption', 'contests', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
