"use client";

import React, { useRef, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { 
  LogOut, 
  UserPlus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user, logout } = useAuth();
  const popupRef = useRef<HTMLDivElement>(null);

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

  if (!isOpen || !user) return null;

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />
      
      {/* Popup */}
      <div
        ref={popupRef}
        className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl min-w-[320px]"
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
                <span className="text-xs font-bold text-white">{user.reputation || 0}</span>
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
            <div className="flex-1 bg-gradient-to-br from-red-500 to-red-600 border border-red-600 rounded-lg px-3 py-2.5 text-center shadow-sm">
              <div className="text-xs text-white font-semibold">{user.hiveBalance || 0} HIVE</div>
            </div>
            {/* SB (Sports Bucks) */}
            <div className="flex-1 bg-gradient-to-br from-green-500 to-green-600 border border-green-600 rounded-lg px-3 py-2.5 text-center shadow-sm">
              <div className="text-xs text-white font-semibold">{user.sbBalance || 0} SB</div>
            </div>
            {/* RC */}
            <div className="flex-1 bg-gradient-to-br from-blue-400 to-blue-500 border border-blue-500 rounded-lg px-3 py-2.5 text-center shadow-sm">
              <div className="text-xs text-white font-semibold">{user.rcBalance || 0} RC</div>
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
