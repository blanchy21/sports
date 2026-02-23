export type UserRole = 'founder' | 'captain' | 'azzurri-aristocrat' | 'la-liga-legend';

interface RoleConfig {
  label: string;
  className: string;
}

const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  founder: {
    label: 'Founder',
    className:
      'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-sm shadow-amber-500/25',
  },
  captain: {
    label: 'Captain',
    className:
      'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm shadow-blue-500/25',
  },
  'azzurri-aristocrat': {
    label: 'Azzurri Aristocrat',
    className:
      'bg-gradient-to-r from-green-600 via-emerald-500 to-blue-600 text-white shadow-sm shadow-green-500/25',
  },
  'la-liga-legend': {
    label: 'La Liga Legend',
    className:
      'bg-gradient-to-r from-red-600 to-yellow-500 text-white shadow-sm shadow-red-500/25',
  },
};

const USER_ROLES: Record<string, UserRole> = {
  blanchy: 'founder',
  niallon11: 'founder',
  talesfrmthecrypt: 'captain',
  bozz: 'captain',
  zottone444: 'azzurri-aristocrat',
  r1c4rd0: 'la-liga-legend',
};

export function getUserRole(username: string): UserRole | null {
  return USER_ROLES[username.toLowerCase()] ?? null;
}

export function getRoleConfig(role: UserRole): RoleConfig {
  return ROLE_CONFIGS[role];
}
