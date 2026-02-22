'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/core/Avatar';
import { LogOut, UserPlus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAioha } from '@/contexts/AiohaProvider';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';
import type { AiohaInstance } from '@/lib/aioha/types';

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
  const { user, logout, updateUser, loginWithHiveUser } = useAuth();
  const { aioha } = useAioha();
  const popupRef = useRef<HTMLDivElement>(null);
  const [isRefreshingRC, setIsRefreshingRC] = useState(false);
  const hasRefreshedRef = useRef(false);
  const [otherAccounts, setOtherAccounts] = useState<{ [username: string]: string }>({});
  const [showAccountsList, setShowAccountsList] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

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
      setShowAccountsList(false);
    }
  }, [isOpen]);

  // Load other accounts when popup opens
  useEffect(() => {
    if (isOpen && aioha) {
      try {
        const others = (aioha as AiohaInstance).getOtherLogins?.();
        setOtherAccounts(others || {});
      } catch {
        setOtherAccounts({});
      }
    }
  }, [isOpen, aioha]);

  const handleSwitchAccount = async (username: string) => {
    if (!aioha || isSwitching) return;
    setIsSwitching(true);
    try {
      const success = (aioha as AiohaInstance).switchUser?.(username);
      if (success) {
        await loginWithHiveUser(username);
        onClose();
      }
    } catch {
      // Switch failed silently
    } finally {
      setIsSwitching(false);
    }
  };

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
        className="border-border bg-card fixed z-50 min-w-[320px] rounded-xl border shadow-2xl"
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
              <div className="from-primary to-bright-cobalt absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-linear-to-r shadow-md">
                <span className="text-[10px] font-bold text-white">
                  {(user.reputation || 0).toFixed(1)}
                </span>
              </div>
            </div>
            <div>
              <div className="text-foreground text-base font-semibold">
                {user.displayName || user.username}
              </div>
              <div className="text-muted-foreground text-sm">@{user.username}</div>
            </div>
          </div>

          {/* Hive Resources */}
          <div className="mb-5 flex space-x-2">
            {/* HP (Hive Power) */}
            <div className="border-primary from-primary to-primary/80 flex-1 rounded-lg border bg-linear-to-br px-3 py-2.5 text-center shadow-xs">
              <div className="text-primary-foreground text-xs font-semibold">
                {user.hivePower !== undefined ? user.hivePower.toFixed(0) : 0} HP
              </div>
            </div>
            {/* MEDALS */}
            <div className="border-accent from-accent to-accent/80 flex-1 rounded-lg border bg-linear-to-br px-3 py-2.5 text-center shadow-xs">
              <div className="text-primary-foreground text-xs font-semibold">
                {user.sbBalance || 0} MEDALS
              </div>
            </div>
            {/* RC */}
            <div className="border-bright-cobalt from-bright-cobalt to-primary relative flex-1 rounded-lg border bg-linear-to-br px-3 py-2.5 text-center shadow-xs">
              <button
                onClick={handleRefreshRC}
                disabled={isRefreshingRC}
                className="absolute top-1 right-1 rounded-full p-1 transition-colors hover:bg-white/20 disabled:opacity-50"
                title="Refresh RC data"
              >
                <RefreshCw
                  className={`h-3 w-3 text-white ${isRefreshingRC ? 'animate-spin' : ''}`}
                />
              </button>
              <div className="text-primary-foreground text-xs font-semibold">
                RC
                {user.rcPercentage !== undefined ? (
                  <div className="text-primary-foreground/80 text-xs font-normal">
                    {user.rcPercentage.toFixed(1)}%
                  </div>
                ) : (
                  <div className="text-primary-foreground/80 text-xs font-normal">
                    Resource Credits information not available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {/* Switch Accounts */}
            {Object.keys(otherAccounts).length > 0 && (
              <>
                <button
                  onClick={() => setShowAccountsList(!showAccountsList)}
                  className="hover:bg-accent/10 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={getHiveAvatarUrl(Object.keys(otherAccounts)[0])}
                      alt={Object.keys(otherAccounts)[0]}
                      fallback={Object.keys(otherAccounts)[0]}
                      size="sm"
                    />
                    <span className="text-foreground text-sm font-medium">
                      Switch accounts ({Object.keys(otherAccounts).length})
                    </span>
                  </div>
                  {showAccountsList ? (
                    <ChevronUp className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <ChevronDown className="text-muted-foreground h-4 w-4" />
                  )}
                </button>

                {/* Account List */}
                {showAccountsList && (
                  <div className="ml-4 space-y-1">
                    {Object.entries(otherAccounts).map(([username, provider]) => (
                      <button
                        key={username}
                        onClick={() => handleSwitchAccount(username)}
                        disabled={isSwitching}
                        className="hover:bg-accent/10 flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-50"
                      >
                        <Avatar
                          src={getHiveAvatarUrl(username)}
                          alt={username}
                          fallback={username}
                          size="sm"
                        />
                        <div className="flex flex-col">
                          <span className="text-foreground text-sm font-medium">@{username}</span>
                          <span className="text-muted-foreground text-xs capitalize">
                            {provider}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Add Account */}
            <button
              onClick={handleAddAccount}
              className="hover:bg-accent/10 flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-left transition-colors"
            >
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                <UserPlus className="text-muted-foreground h-4 w-4" />
              </div>
              <span className="text-foreground text-sm font-medium">Add/Switch account</span>
            </button>

            {/* Divider */}
            <div className="border-border my-2 border-t" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="group hover:bg-destructive/10 flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-left transition-colors"
            >
              <div className="bg-destructive/10 group-hover:bg-destructive/20 flex h-8 w-8 items-center justify-center rounded-full transition-colors">
                <LogOut className="text-destructive h-4 w-4" />
              </div>
              <span className="text-destructive text-sm font-medium">Logout @{user.username}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
