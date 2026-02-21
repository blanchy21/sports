import { isHiveAccount } from '@/lib/hive-workerbee/account';

export function isValidHiveUsername(name: string): { valid: boolean; reason?: string } {
  if (!name) {
    return { valid: false, reason: 'Username is required' };
  }

  if (name.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters' };
  }

  if (name.length > 16) {
    return { valid: false, reason: 'Username must be at most 16 characters' };
  }

  if (name !== name.toLowerCase()) {
    return { valid: false, reason: 'Username must be lowercase' };
  }

  if (!/^[a-z][a-z0-9.-]*[a-z0-9]$/.test(name)) {
    if (!/^[a-z]/.test(name)) {
      return { valid: false, reason: 'Username must start with a letter' };
    }
    if (!/[a-z0-9]$/.test(name)) {
      return { valid: false, reason: 'Username must end with a letter or digit' };
    }
    return {
      valid: false,
      reason: 'Username can only contain lowercase letters, digits, dashes, and dots',
    };
  }

  if (/--/.test(name)) {
    return { valid: false, reason: 'Username cannot contain consecutive dashes' };
  }

  if (/\.\./.test(name)) {
    return { valid: false, reason: 'Username cannot contain consecutive dots' };
  }

  // Each segment separated by . must be >= 3 chars
  const segments = name.split('.');
  for (const seg of segments) {
    if (seg.length < 3) {
      return {
        valid: false,
        reason: 'Each segment separated by a dot must be at least 3 characters',
      };
    }
  }

  return { valid: true };
}

export function suggestUsername(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 13); // Leave room for 'sb-' prefix (max 16 chars total)

  if (!base) {
    return 'sb-user';
  }

  return `sb-${base}`;
}

export async function checkUsernameAvailability(name: string): Promise<boolean> {
  const exists = await isHiveAccount(name);
  return !exists;
}
