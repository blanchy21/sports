'use client';

import React from 'react';
import { Shield, Crown, Gem, Flame } from 'lucide-react';
import { getUserRole, getRoleConfig, type UserRole } from '@/lib/user-roles';

interface RoleBadgeProps {
  username: string;
  size?: 'sm' | 'md';
}

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  founder: Crown,
  captain: Shield,
  'azzurri-aristocrat': Gem,
  'la-liga-legend': Flame,
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ username, size = 'sm' }) => {
  const role = getUserRole(username);
  if (!role) return null;

  const config = getRoleConfig(role);
  const Icon = ROLE_ICONS[role];

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs';
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses} ${config.className}`}
    >
      <Icon className={iconSize} />
      {config.label}
    </span>
  );
};
