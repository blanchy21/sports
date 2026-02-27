import crypto from 'crypto';
import { PREDICTION_CONFIG } from './constants';

const DEV_FALLBACK_SECRET = 'dev-only-prediction-stake-token-secret-do-not-use-in-prod';

function getStakeTokenSecret(): string {
  const secret =
    process.env.STAKE_TOKEN_SECRET ||
    process.env.SESSION_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw new Error(
        'STAKE_TOKEN_SECRET, SESSION_ENCRYPTION_KEY, or SESSION_SECRET is required in production'
      );
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}

interface StakeTokenData {
  predictionId: string;
  username: string;
  outcomeId: string;
  amount: number;
}

export function signStakeToken(data: StakeTokenData): string {
  const secret = getStakeTokenSecret();
  const exp = Date.now() + PREDICTION_CONFIG.STAKE_TOKEN_EXPIRY_SECONDS * 1000;

  const payload = Buffer.from(
    JSON.stringify({
      predictionId: data.predictionId,
      username: data.username,
      outcomeId: data.outcomeId,
      amount: data.amount,
      exp,
    })
  ).toString('base64');

  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return `${payload}.${signature}`;
}

export function verifyStakeToken(token: string): StakeTokenData | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const secret = getStakeTokenSecret();

  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Timing-safe comparison
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
      typeof decoded.predictionId !== 'string' ||
      typeof decoded.username !== 'string' ||
      typeof decoded.outcomeId !== 'string' ||
      typeof decoded.amount !== 'number'
    ) {
      return null;
    }

    return {
      predictionId: decoded.predictionId,
      username: decoded.username,
      outcomeId: decoded.outcomeId,
      amount: decoded.amount,
    };
  } catch {
    return null;
  }
}
