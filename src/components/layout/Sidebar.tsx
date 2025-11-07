"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Star, 
  Clock, 
  Compass, 
  Video, 
  Bookmark, 
  LayoutDashboard, 
  Edit, 
  MessageSquare, 
  FileEdit,
  Zap,
  User,
  DollarSign,
  BookOpen,
  BarChart3,
  Users,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfilePopup } from "@/components/UserProfilePopup";
import { Avatar } from "@/components/ui/Avatar";

const navigationItems = [
  { href: "/", icon: Star, label: "Featured", requireAuth: false, featured: true },
  { href: "/new", icon: Clock, label: "New", requireAuth: false, featured: true },
  { href: "/discover", icon: Compass, label: "Discover", requireAuth: false, featured: true },
  { href: "/feed", icon: BookOpen, label: "Feed", requireAuth: false, featured: true },
  { href: "/videos", icon: Video, label: "Videos", requireAuth: false },
  { href: "/shorts", icon: Zap, label: "Shorts", requireAuth: false },
  { href: "/bookmarks", icon: Bookmark, label: "Bookmarks", requireAuth: false },
  { href: "/publish", icon: Edit, label: "Publish", requireAuth: false },
  { href: "/drafts", icon: FileEdit, label: "Drafts", requireAuth: false },
  { href: "/replies", icon: MessageSquare, label: "Replies", requireAuth: false },
  { href: "/profile", icon: User, label: "Profile", requireAuth: false },
  { href: "/followers", icon: Users, label: "Followers", requireAuth: true },
  { href: "/following", icon: UserPlus, label: "Following", requireAuth: true },
  { href: "/wallet", icon: DollarSign, label: "Wallet", requireAuth: false },
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", requireAuth: false },
  { href: "/monitoring", icon: BarChart3, label: "Monitoring", requireAuth: false },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const profileTriggerRef = useRef<HTMLDivElement>(null);

  // Ensure hydration is complete before showing dynamic content
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Use a consistent base className that doesn't change between server/client
  const getLinkClassName = (isActive: boolean) => {
    const baseClasses = "flex items-center px-4 py-3 text-base font-medium rounded-md transition-colors";
    const activeClasses = isActive 
      ? "bg-primary text-primary-foreground" 
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground";
    return `${baseClasses} ${activeClasses}`;
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-80 lg:fixed lg:inset-y-0 lg:pt-24 lg:pb-4 lg:overflow-y-auto lg:border-r bg-background">
        <div className="flex flex-col flex-1 min-h-0">
        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigationItems.map((item) => {
            // Skip items that require auth if user is not authenticated
            if (item.requireAuth && !isHydrated) return null;
            if (item.requireAuth && !user) return null;

            const Icon = item.icon;

            const isActive = isHydrated && pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={getLinkClassName(isActive)}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section at Bottom */}
        {isHydrated && user && (
          <div className="p-4 border-t">
          <div 
            ref={profileTriggerRef}
            onClick={() => setShowProfilePopup(!showProfilePopup)}
            className="flex items-center space-x-3 p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
          >
            <Avatar
              src={user.avatar}
              alt={user.displayName || user.username}
              fallback={user.username}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user.displayName || user.username}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                @{user.username}
              </div>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Profile Popup */}
      {isHydrated && user && (
        <UserProfilePopup
          isOpen={showProfilePopup}
          onClose={() => setShowProfilePopup(false)}
          triggerRef={profileTriggerRef}
        />
      )}
    </aside>
  );
};
