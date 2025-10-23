"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { 
  LogOut, 
  UserPlus,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserAccount } from "@/lib/hive-workerbee/account";

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
  const { user, logout, updateUser } = useAuth();
  const popupRef = useRef<HTMLDivElement>(null);
  const [isRefreshingRC, setIsRefreshingRC] = useState(false);
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
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleRefreshRC = useCallback(async () => {
    if (!user?.username || isRefreshingRC) return; // Prevent concurrent calls
    
    console.log(`[UserProfilePopup] Refreshing RC for ${user.username}...`);
    setIsRefreshingRC(true);
    try {
      const accountData = await fetchUserAccount(user.username);
      if (accountData) {
        console.log(`[UserProfilePopup] RC data received: ${accountData.resourceCredits.toFixed(2)}%`);
        updateUser({
          rcPercentage: accountData.resourceCredits,
          rcBalance: accountData.resourceCredits, // Assuming RC balance is the same as percentage for now
        });
      }
    } catch (error) {
      console.error('Error refreshing RC data:', error);
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
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-r from-primary to-teal-600 border-2 border-white rounded-full flex items-center justify-center shadow-md">
                <span className="text-[10px] font-bold text-white">{(user.reputation || 0).toFixed(1)}</span>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-base">
                {user.displayName || user.username}
              </div>
              <div className="text-sm text-gray-500">
                @{user.username}
              </div>
            </div>
          </div>

          {/* Hive Resources */}
          <div className="flex space-x-2 mb-5">
            {/* HIVE */}
            <div className="flex-1 bg-gradient-to-br from-japanese-laurel to-primary border border-japanese-laurel rounded-lg px-3 py-2.5 text-center shadow-sm">
              <div className="text-xs text-white font-semibold">{user.hiveBalance || 0} HIVE</div>
            </div>
            {/* SB (Sports Bucks) */}
            <div className="flex-1 bg-gradient-to-br from-japanese-laurel to-maximum-yellow border border-japanese-laurel rounded-lg px-3 py-2.5 text-center shadow-sm">
              <div className="text-xs text-white font-semibold">{user.sbBalance || 0} SB</div>
            </div>
            {/* RC */}
            <div className="flex-1 bg-gradient-to-br from-maximum-yellow to-japanese-laurel border border-maximum-yellow rounded-lg px-3 py-2.5 text-center shadow-sm relative">
              <button
                onClick={handleRefreshRC}
                disabled={isRefreshingRC}
                className="absolute top-1 right-1 p-1 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
                title="Refresh RC data"
              >
                <RefreshCw className={`w-3 h-3 text-white ${isRefreshingRC ? 'animate-spin' : ''}`} />
              </button>
              <div className="text-xs text-white font-semibold">
                RC
                {user.rcPercentage !== undefined ? (
                  <div className="text-xs text-white/80 font-normal">
                    {user.rcPercentage.toFixed(1)}%
                  </div>
                ) : (
                  <div className="text-xs text-white/80 font-normal">
                    Resource Credits information not available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {/* Switch Accounts */}
            <button className="w-full flex items-center space-x-3 px-3 py-2.5 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <Avatar
                src={user.avatar}
                alt={user.displayName || user.username}
                fallback={user.username}
                size="sm"
              />
              <span className="text-gray-700 text-sm font-medium">Switch accounts (1)</span>
            </button>

            {/* Add Account */}
            <button className="w-full flex items-center space-x-3 px-3 py-2.5 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-gray-600" />
              </div>
              <span className="text-gray-700 text-sm font-medium">Add account</span>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200 my-2" />

            {/* Logout */}
            <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2.5 text-left hover:bg-red-50 rounded-lg transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                <LogOut className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-red-600 text-sm font-medium">Logout @{user.username}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
