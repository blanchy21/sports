'use client';

import React from 'react';
import Image from 'next/image';
import { User } from '@/types';
import { Badge } from '@/components/core/Badge';
import { Zap, User as UserIcon, Crown, Star } from 'lucide-react';

interface AccountBadgeProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  showType?: boolean;
  showEarnings?: boolean;
  className?: string;
}

export const AccountBadge: React.FC<AccountBadgeProps> = ({
  user,
  size = 'md',
  showType = true,
  showEarnings = false,
  className = '',
}) => {
  const isHiveUser = user.isHiveAuth;
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (!showType) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white ${size === 'sm' ? 'h-6 w-6 text-xs' : size === 'lg' ? 'h-10 w-10 text-lg' : ''}`}
        >
          {user.displayName?.charAt(0).toUpperCase() ||
            user.username?.charAt(0).toUpperCase() ||
            'U'}
        </div>
        <div>
          <div
            className={`font-medium text-foreground ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm'}`}
          >
            {user.displayName || user.username}
          </div>
          {size !== 'sm' && (
            <div className={`text-muted-foreground ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
              @{user.username}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white ${size === 'sm' ? 'h-6 w-6 text-xs' : size === 'lg' ? 'h-10 w-10 text-lg' : ''}`}
      >
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={user.displayName || user.username}
            width={size === 'sm' ? 24 : size === 'lg' ? 40 : 32}
            height={size === 'sm' ? 24 : size === 'lg' ? 40 : 32}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'
        )}
      </div>

      {/* User Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center space-x-2">
          <div
            className={`truncate font-medium text-foreground ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm'}`}
          >
            {user.displayName || user.username}
          </div>
          {isHiveUser && <Crown className={`${iconSizes[size]} text-warning`} />}
        </div>

        <div className="flex items-center space-x-2">
          <div
            className={`truncate text-muted-foreground ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'}`}
          >
            @{user.username}
          </div>

          {/* Account Type Badge */}
          <Badge
            variant={isHiveUser ? 'default' : 'secondary'}
            className={`${sizeClasses[size]} flex items-center space-x-1`}
          >
            {isHiveUser ? (
              <>
                <Zap className={iconSizes[size]} />
                <span>Hive</span>
              </>
            ) : (
              <>
                <UserIcon className={iconSizes[size]} />
                <span>Email</span>
              </>
            )}
          </Badge>
        </div>

        {/* Earnings indicator for Hive users */}
        {showEarnings && isHiveUser && user.hiveBalance !== undefined && (
          <div
            className={`font-medium text-success ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'}`}
          >
            {user.hiveBalance.toFixed(3)} HIVE
          </div>
        )}
      </div>
    </div>
  );
};

export const AccountTypeIndicator: React.FC<{ user: User; className?: string }> = ({
  user,
  className = '',
}) => {
  const isHiveUser = user.isHiveAuth;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isHiveUser ? (
        <>
          <div className="h-2 w-2 rounded-full bg-success"></div>
          <span className="text-sm text-foreground/70">Hive Account</span>
          <Badge variant="default" className="text-xs">
            <Zap className="mr-1 h-3 w-3" />
            Can Earn
          </Badge>
        </>
      ) : (
        <>
          <div className="h-2 w-2 rounded-full bg-info"></div>
          <span className="text-sm text-foreground/70">Email Account</span>
          <Badge variant="secondary" className="text-xs">
            <UserIcon className="mr-1 h-3 w-3" />
            View Only
          </Badge>
        </>
      )}
    </div>
  );
};

export const UpgradePrompt: React.FC<{
  user: User;
  onUpgrade: () => void;
  onDismiss: () => void;
  className?: string;
}> = ({ user, onUpgrade, onDismiss, className = '' }) => {
  if (user.isHiveAuth) return null;

  return (
    <div
      className={`rounded-lg border border-warning/30 bg-gradient-to-r from-warning/10 to-orange-500/10 p-4 ${className}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-warning/15">
          <Star className="h-4 w-4 text-warning" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="mb-1 font-medium text-foreground">Unlock Earning Potential</h4>
          <p className="mb-3 text-sm text-warning">
            Upgrade to a Hive account to start earning crypto rewards for your sports content and
            engagement.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={onUpgrade}
              className="rounded-md bg-warning px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-warning/90"
            >
              Upgrade Now
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-sm font-medium text-warning transition-colors hover:text-warning/80"
            >
              Maybe Later
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-warning/60 transition-colors hover:text-warning"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
