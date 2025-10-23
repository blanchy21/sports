"use client";

import React from "react";
import { User } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { 
  Shield, 
  Zap, 
  User as UserIcon,
  Crown,
  Star
} from "lucide-react";

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
  className = ""
}) => {
  const isHiveUser = user.isHiveAuth;
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  if (!showType) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ${size === 'sm' ? 'w-6 h-6 text-xs' : size === 'lg' ? 'w-10 h-10 text-lg' : ''}`}>
          {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <div className={`font-medium text-slate-900 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm'}`}>
            {user.displayName || user.username}
          </div>
          {size !== 'sm' && (
            <div className={`text-slate-500 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
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
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ${size === 'sm' ? 'w-6 h-6 text-xs' : size === 'lg' ? 'w-10 h-10 text-lg' : ''}`}>
        {user.avatar ? (
          <img 
            src={user.avatar} 
            alt={user.displayName || user.username}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <div className={`font-medium text-slate-900 truncate ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm'}`}>
            {user.displayName || user.username}
          </div>
          {isHiveUser && (
            <Crown className={`${iconSizes[size]} text-yellow-500`} />
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`text-slate-500 truncate ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'}`}>
            @{user.username}
          </div>
          
          {/* Account Type Badge */}
          <Badge 
            variant={isHiveUser ? "default" : "secondary"}
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
          <div className={`text-green-600 font-medium ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'}`}>
            {user.hiveBalance.toFixed(3)} HIVE
          </div>
        )}
      </div>
    </div>
  );
};

export const AccountTypeIndicator: React.FC<{ user: User; className?: string }> = ({ user, className = "" }) => {
  const isHiveUser = user.isHiveAuth;
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isHiveUser ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-slate-600">Hive Account</span>
          <Badge variant="default" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            Can Earn
          </Badge>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-slate-600">Email Account</span>
          <Badge variant="secondary" className="text-xs">
            <UserIcon className="h-3 w-3 mr-1" />
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
}> = ({ user, onUpgrade, onDismiss, className = "" }) => {
  if (user.isHiveAuth) return null;

  return (
    <div className={`bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Star className="h-4 w-4 text-yellow-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-yellow-900 mb-1">Unlock Earning Potential</h4>
          <p className="text-sm text-yellow-700 mb-3">
            Upgrade to a Hive account to start earning crypto rewards for your sports content and engagement.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={onUpgrade}
              className="px-3 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors"
            >
              Upgrade Now
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-yellow-700 text-sm font-medium hover:text-yellow-800 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-yellow-400 hover:text-yellow-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
