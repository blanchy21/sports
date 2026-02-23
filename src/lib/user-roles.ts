export type UserRole = 'founder' | 'captain';

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
};

const USER_ROLES: Record<string, UserRole> = {
  blanchy: 'founder',
  niallon11: 'founder',
  talesfrmthecrypt: 'captain',
  bozz: 'captain',
};

export function getUserRole(username: string): UserRole | null {
  return USER_ROLES[username.toLowerCase()] ?? null;
}

export function getRoleConfig(role: UserRole): RoleConfig {
  return ROLE_CONFIGS[role];
}
