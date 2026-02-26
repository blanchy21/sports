'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/core/Avatar';
import { LogOut, UserPlus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';
import { useMedalsBalance } from '@/lib/react-query/queries/useMedals';

interface UserProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

export const UserProfilePopup: React.FC<UserProfilePopupProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const popupRef = useRef<HTMLDivElement>(null);
  const [isRefreshingRC, setIsRefreshingRC] = useState(false);
  const { data: medalsBalance } = useMedalsBalance(user?.username);
  const hasRefreshedRef = useRef(false);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  const handleLogout = async () => {
    onClose();
    await logout();
    router.push('/auth');
  };

  const handleRefreshRC = useCallback(async () => {
    if (!user?.username || isRefreshingRC) return; // Prevent concurrent calls

    setIsRefreshingRC(true);
    try {
      const accountData = await fetchUserAccount(user.username);
      if (accountData) {
        updateUser({
          rcPercentage: accountData.resourceCredits,
          rcBalance: accountData.resourceCredits, // Assuming RC balance is the same as percentage for now
        });
      }
    } catch {
      // RC refresh failed silently - user can try again
    } finally {
      setIsRefreshingRC(false);
    }
  }, [user?.username, updateUser, isRefreshingRC]);

  // Stable refresh function that doesn't change on every render
  const refreshRC = useCallback(() => {
    if (user?.username && !isRefreshingRC && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      handleRefreshRC();
    }
  }, [user?.username, isRefreshingRC, handleRefreshRC]);

  // Always refresh RC data when popup opens to ensure we have the latest data
  useEffect(() => {
    if (isOpen && user) {
      // Add a small delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        refreshRC();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, user, refreshRC]);

  // Reset refreshing state when popup closes
  useEffect(() => {
    if (!isOpen) {
      setIsRefreshingRC(false);
      hasRefreshedRef.current = false;
    }
  }, [isOpen]);

  const handleAddAccount = () => {
    onClose();
    router.push('/auth?addAccount=true');
  };

  if (!isOpen || !user) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />

      {/* Popup */}
      <div
        ref={popupRef}
        className="fixed z-50 min-w-[320px] rounded-xl border border-border/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-[hsl(220_25%_8%/0.85)]"
        style={{
          left: triggerRef.current?.getBoundingClientRect().left || 0,
          bottom: window.innerHeight - (triggerRef.current?.getBoundingClientRect().top || 0) + 10,
        }}
      >
        <div className="p-5">
          {/* User Profile Section */}
          <div className="mb-5 flex items-center space-x-3">
            <div className="relative">
              <Avatar
                src={user.avatar}
                alt={user.displayName || user.username}
                fallback={user.username}
                size="lg"
              />
              {/* Reputation Badge */}
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-r from-primary to-bright-cobalt shadow-md">
                <span className="text-[10px] font-bold text-white">
                  {(user.reputation || 0).toFixed(1)}
                </span>
              </div>
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">
                {user.displayName || user.username}
              </div>
              <div className="text-sm text-muted-foreground">@{user.username}</div>
            </div>
          </div>

          {/* Hive Resources */}
          <div className="mb-5 flex space-x-2">
            {/* HP (Hive Power) */}
            <div className="flex-1 rounded-lg border border-primary bg-gradient-to-br from-primary to-primary/80 px-3 py-2.5 text-center shadow-sm">
              <div className="text-xs font-semibold text-primary-foreground">
                {user.hivePower !== undefined ? user.hivePower.toFixed(0) : 0} HP
              </div>
            </div>
            {/* MEDALS */}
            <div className="flex-1 rounded-lg border border-accent bg-gradient-to-br from-accent to-accent/80 px-3 py-2.5 text-center shadow-sm">
              <div className="text-xs font-semibold text-primary-foreground">
                {medalsBalance ? parseFloat(medalsBalance.total).toFixed(0) : '...'} MEDALS
              </div>
            </div>
            {/* RC */}
            <div className="relative flex-1 rounded-lg border border-bright-cobalt bg-gradient-to-br from-bright-cobalt to-primary px-3 py-2.5 text-center shadow-sm">
              <button
                onClick={handleRefreshRC}
                disabled={isRefreshingRC}
                className="absolute right-1 top-1 rounded-full p-1 transition-colors hover:bg-white/20 disabled:opacity-50"
                title="Refresh RC data"
              >
                <RefreshCw
                  className={`h-3 w-3 text-white ${isRefreshingRC ? 'animate-spin' : ''}`}
                />
              </button>
              <div className="text-xs font-semibold text-primary-foreground">
                RC
                {user.rcPercentage !== undefined ? (
                  <div className="text-xs font-normal text-primary-foreground/80">
                    {user.rcPercentage.toFixed(1)}%
                  </div>
                ) : (
                  <div className="text-xs font-normal text-primary-foreground/80">
                    Resource Credits information not available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {/* Add Account */}
            <button
              onClick={handleAddAccount}
              className="flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-foreground/5 dark:hover:bg-white/[0.08]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">Add/Switch account</span>
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-border/50 dark:border-white/[0.08]" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="group flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-destructive/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 transition-colors group-hover:bg-destructive/20">
                <LogOut className="h-4 w-4 text-destructive" />
              </div>
              <span className="text-sm font-medium text-destructive">Logout @{user.username}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
