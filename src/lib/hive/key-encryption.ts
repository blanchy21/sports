import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT = 'sportsblock-key-encryption-salt';

function getEncryptionKey(): Buffer {
  const secret = process.env.KEY_ENCRYPTION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('KEY_ENCRYPTION_SECRET environment variable is required in production');
    }
    return crypto.scryptSync('development-only-insecure-key-encryption', SALT, 32);
  }

  return crypto.scryptSync(secret, SALT, 32);
}

export function encryptKeys(keysJson: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(keysJson, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine encrypted data + auth tag
  const combined = Buffer.concat([encrypted, authTag]);

  return {
    encrypted: combined.toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function decryptKeys(encrypted: string, iv: string): string {
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, 'base64');
  const combined = Buffer.from(encrypted, 'base64');

  // Auth tag is the last 16 bytes
  const AUTH_TAG_LENGTH = 16;
  const encryptedData = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted.toString('utf8');
}
