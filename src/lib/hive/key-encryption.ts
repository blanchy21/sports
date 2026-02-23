import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(salt: Buffer): Buffer {
  const secret = process.env.KEY_ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error(
      'KEY_ENCRYPTION_SECRET environment variable is required. ' +
        'Set it in .env.local for development.'
    );
  }

  return crypto.scryptSync(secret, salt, 32);
}

export function encryptKeys(keysJson: string): { encrypted: string; iv: string; salt: string } {
  const salt = crypto.randomBytes(16);
  const key = getEncryptionKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(keysJson, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine encrypted data + auth tag
  const combined = Buffer.concat([encrypted, authTag]);

  return {
    encrypted: combined.toString('base64'),
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
  };
}

export function decryptKeys(encrypted: string, iv: string, salt: string): string {
  const saltBuffer = Buffer.from(salt, 'base64');
  const key = getEncryptionKey(saltBuffer);
  const ivBuffer = Buffer.from(iv, 'base64');
  const combined = Buffer.from(encrypted, 'base64');

  const encryptedData = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted.toString('utf8');
}
