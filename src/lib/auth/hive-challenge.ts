/**
 * Hive Challenge-Response Authentication
 *
 * Stateless HMAC-based challenge generation + Hive signature verification.
 * Prevents session spoofing by requiring wallet ownership proof.
 *
 * Flow:
 *   1. Server creates a challenge string + HMAC (tamper-proof, stateless)
 *   2. Client signs the challenge with their Hive posting key (via Aioha)
 *   3. Server recovers the public key from the signature and verifies it
 *      matches the account's on-chain posting keys
 */

import crypto from 'crypto';
import { Signature, cryptoUtils, PublicKey } from '@hiveio/dhive';
import { Client } from '@hiveio/dhive';
import { HIVE_NODES } from '@/lib/hive-workerbee/nodes';

// Challenge expires after 5 minutes
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// Domain separator ensures HMAC keys are unique to this purpose
const HMAC_DOMAIN = 'sportsblock-hive-auth-challenge-v1';

/**
 * Derive the HMAC key from SESSION_SECRET with a domain separator.
 * Uses HKDF-like construction: HMAC(secret, domain).
 */
function getHmacKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('SESSION_SECRET is required for challenge generation');
    }
    // Dev fallback only
    return crypto.createHmac('sha256', 'dev-only-insecure').update(HMAC_DOMAIN).digest();
  }
  return crypto.createHmac('sha256', secret).update(HMAC_DOMAIN).digest();
}

/**
 * Create a challenge string and its HMAC for a given username.
 *
 * Format: `sportsblock-auth:{username}:{nonce}:{timestamp}`
 * The HMAC prevents tampering (changing username or replaying expired challenges).
 */
export function createChallenge(username: string): { challenge: string; mac: string } {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const challenge = `sportsblock-auth:${username}:${nonce}:${timestamp}`;

  const key = getHmacKey();
  const mac = crypto.createHmac('sha256', key).update(challenge).digest('hex');

  return { challenge, mac };
}

/**
 * Verify a challenge string + HMAC.
 * Checks: HMAC integrity (timing-safe), expiry, and username match.
 */
export function verifyChallenge(
  challenge: string,
  mac: string,
  expectedUsername: string
): { valid: boolean; reason?: string } {
  // Parse challenge format
  const parts = challenge.split(':');
  if (parts.length !== 4 || parts[0] !== 'sportsblock-auth') {
    return { valid: false, reason: 'Invalid challenge format' };
  }

  const [, challengeUsername, , timestampStr] = parts;

  // Verify username matches
  if (challengeUsername !== expectedUsername) {
    return { valid: false, reason: 'Challenge username mismatch' };
  }

  // Verify HMAC (timing-safe comparison)
  const key = getHmacKey();
  const expectedMac = crypto.createHmac('sha256', key).update(challenge).digest('hex');
  const macBuffer = Buffer.from(mac, 'hex');
  const expectedMacBuffer = Buffer.from(expectedMac, 'hex');

  if (macBuffer.length !== expectedMacBuffer.length) {
    return { valid: false, reason: 'Invalid MAC' };
  }

  if (!crypto.timingSafeEqual(macBuffer, expectedMacBuffer)) {
    return { valid: false, reason: 'Invalid MAC' };
  }

  // Verify expiry
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > CHALLENGE_TTL_MS) {
    return { valid: false, reason: 'Challenge expired' };
  }

  return { valid: true };
}

/**
 * Verify a Hive posting key signature against on-chain keys.
 *
 * Steps:
 *   1. Hash the challenge message (sha256, same as wallet-side)
 *   2. Recover the public key from the signature
 *   3. Fetch the account's posting key_auths from the blockchain
 *   4. Check if the recovered key matches any authorized posting key
 */
export async function verifyHivePostingSignature(
  challenge: string,
  signatureHex: string,
  username: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // 1. Hash the challenge (same as Aioha's signMessage: cryptoUtils.sha256(message))
    const messageHash = cryptoUtils.sha256(challenge);

    // 2. Recover public key from signature
    const signature = Signature.fromString(signatureHex);
    const recoveredKey: PublicKey = signature.recover(messageHash);
    const recoveredKeyStr = recoveredKey.toString();

    // 3. Fetch on-chain account data
    const client = new Client(HIVE_NODES);
    const accounts = await client.database.getAccounts([username]);

    if (!accounts || accounts.length === 0) {
      return { valid: false, reason: 'Account not found on chain' };
    }

    const account = accounts[0];
    const postingAuth = account.posting;

    if (!postingAuth?.key_auths || postingAuth.key_auths.length === 0) {
      return { valid: false, reason: 'No posting keys found on account' };
    }

    // 4. Compare recovered key against authorized posting keys
    const authorizedKeys = postingAuth.key_auths.map(([key]) =>
      typeof key === 'string' ? key : key.toString()
    );

    if (authorizedKeys.includes(recoveredKeyStr)) {
      return { valid: true };
    }

    return { valid: false, reason: 'Signature does not match any posting key on account' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, reason: `Signature verification failed: ${message}` };
  }
}
