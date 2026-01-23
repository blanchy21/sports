"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import {
  LogOut,
  UserPlus,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAioha } from "@/contexts/AiohaProvider";
import { fetchUserAccount } from "@/lib/hive-workerbee/account";

interface AiohaInstance {
  getOtherLogins(): { [username: string]: string };
  switchUser(username: string): boolean;
  getCurrentUser(): string;
}

interface UserProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

export const UserProfilePopup: React.FC<UserProfilePopupProps> = ({
  isOpen,
  onClose,
  triggerRef
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
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  const handleLogout = async () => {
    onClose();
    await logout();
    router.push("/auth");
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
        const others = (aioha as AiohaInstance).getOtherLogins();
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
      const success = (aioha as AiohaInstance).switchUser(username);
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
    router.push("/auth?addAccount=true");
  };

  if (!isOpen || !user) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />
      
      {/* Popup */}
      <div
        ref={popupRef}
        className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl min-w-[320px]"
        style={{
          left: triggerRef.current?.getBoundingClientRect().left || 0,
          bottom: window.innerHeight - (triggerRef.current?.getBoundingClientRect().top || 0) + 10,
        }}
      >
        <div className="p-5">
          {/* User Profile Section */}
          <div className="flex items-center space-x-3 mb-5">
            <div className="relative">
              <Avatar
                src={user.avatar}
                alt={user.displayName || user.username}
                fallback={user.username}
                size="lg"
              />
              {/* Reputation Badge */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-r from-primary to-bright-cobalt border-2 border-white rounded-full flex items-center justify-center shadow-md">
                <span className="text-[10px] font-bold text-white">{(user.reputation || 0).toFixed(1)}</span>
              </div>
            </div>
            <div>
              <div className="font-semibold text-foreground text-base">
                {user.displayName || user.username}
              </div>
              <div className="text-sm text-muted-foreground">
                @{user.username}
              </div>
            </div>
          </div>

          {/* Hive Resources */}
          <div className="flex space-x-2 mb-5">
            {/* HP (Hive Power) */}
            <div className="flex-1 bg-gradient-to-br from-primary to-primary/80 border border-primary rounded-lg px-3 py-2.5 text-center shadow-sm">
              <div className="text-xs text-primary-foreground font-semibold">{user.hivePower !== undefined ? user.hivePower.toFixed(0) : 0} HP</div>
            </div>
            {/* MEDALS */}
            <div className="flex-1 bg-gradient-to-br from-accent to-accent/80 border border-accent rounded-lg px-3 py-2.5 text-center shadow-sm">
              <div className="text-xs text-primary-foreground font-semibold">{user.sbBalance || 0} MEDALS</div>
            </div>
            {/* RC */}
            <div className="flex-1 bg-gradient-to-br from-bright-cobalt to-primary border border-bright-cobalt rounded-lg px-3 py-2.5 text-center shadow-sm relative">
              <button
                onClick={handleRefreshRC}
                disabled={isRefreshingRC}
                className="absolute top-1 right-1 p-1 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
                title="Refresh RC data"
              >
                <RefreshCw className={`w-3 h-3 text-white ${isRefreshingRC ? 'animate-spin' : ''}`} />
              </button>
              <div className="text-xs text-primary-foreground font-semibold">
                RC
                {user.rcPercentage !== undefined ? (
                  <div className="text-xs text-primary-foreground/80 font-normal">
                    {user.rcPercentage.toFixed(1)}%
                  </div>
                ) : (
                  <div className="text-xs text-primary-foreground/80 font-normal">
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
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-accent/10 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={`https://images.hive.blog/u/${Object.keys(otherAccounts)[0]}/avatar`}
                      alt={Object.keys(otherAccounts)[0]}
                      fallback={Object.keys(otherAccounts)[0]}
                      size="sm"
                    />
                    <span className="text-foreground text-sm font-medium">
                      Switch accounts ({Object.keys(otherAccounts).length})
                    </span>
                  </div>
                  {showAccountsList ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Avatar
                          src={`https://images.hive.blog/u/${username}/avatar`}
                          alt={username}
                          fallback={username}
                          size="sm"
                        />
                        <div className="flex flex-col">
                          <span className="text-foreground text-sm font-medium">@{username}</span>
                          <span className="text-muted-foreground text-xs capitalize">{provider}</span>
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
              className="w-full flex items-center space-x-3 px-3 py-2.5 text-left hover:bg-accent/10 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-foreground text-sm font-medium">Add/Switch account</span>
            </button>

            {/* Divider */}
            <div className="border-t border-border my-2" />

            {/* Logout */}
            <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2.5 text-left hover:bg-destructive/10 rounded-lg transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-destructive/10 group-hover:bg-destructive/20 flex items-center justify-center transition-colors">
                <LogOut className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-destructive text-sm font-medium">Logout @{user.username}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
