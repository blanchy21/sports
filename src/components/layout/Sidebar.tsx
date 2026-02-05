'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Star,
  Clock,
  Compass,
  Bookmark,
  LayoutDashboard,
  Edit,
  MessageSquare,
  FileEdit,
  Zap,
  User,
  DollarSign,
  BookOpen,
  Users,
  UserPlus,
  Users2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfilePopup } from '@/components/user/UserProfilePopup';
import { Avatar } from '@/components/core/Avatar';

const navigationItems = [
  { href: '/', icon: Star, label: 'Featured', requireAuth: false, featured: true },
  { href: '/new', icon: Clock, label: 'New', requireAuth: false, featured: true },
  { href: '/discover', icon: Compass, label: 'Discover', requireAuth: false, featured: true },
  { href: '/feed', icon: BookOpen, label: 'Feed', requireAuth: false, featured: true },
  { href: '/communities', icon: Users2, label: 'Communities', requireAuth: false, featured: true },
  { href: '/sportsbites', icon: Zap, label: 'Sportsbites', requireAuth: false },
  { href: '/bookmarks', icon: Bookmark, label: 'Bookmarks', requireAuth: false },
  { href: '/publish', icon: Edit, label: 'Publish', requireAuth: false },
  { href: '/drafts', icon: FileEdit, label: 'Drafts', requireAuth: false },
  { href: '/replies', icon: MessageSquare, label: 'Replies', requireAuth: false },
  { href: '/profile', icon: User, label: 'Profile', requireAuth: false },
  { href: '/followers', icon: Users, label: 'Followers', requireAuth: true },
  { href: '/following', icon: UserPlus, label: 'Following', requireAuth: true },
  { href: '/wallet', icon: DollarSign, label: 'Wallet', requireAuth: false },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', requireAuth: false },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const profileTriggerRef = useRef<HTMLDivElement>(null);

  // Use a consistent base className that doesn't change between server/client
  const getLinkClassName = (isActive: boolean) => {
    const baseClasses =
      'flex items-center px-4 py-3 text-base font-medium rounded-md transition-colors';
    const activeClasses = isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground';
    const className = `${baseClasses} ${activeClasses}`;
    return className;
  };

  return (
    <aside className="hidden bg-background lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:overflow-y-auto lg:border-r lg:pb-4 lg:pt-20 xl:w-80 xl:pt-24">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-4">
          {navigationItems.map((item) => {
            // Skip items that require auth if user is not authenticated
            if (item.requireAuth && !user) return null;

            const Icon = item.icon;

            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={getLinkClassName(isActive)}
                suppressHydrationWarning
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section at Bottom */}
        {user && (
          <div className="border-t p-4">
            <div
              ref={profileTriggerRef}
              onClick={() => setShowProfilePopup(!showProfilePopup)}
              className="flex cursor-pointer items-center space-x-3 rounded-md p-3 transition-colors hover:bg-accent"
            >
              <Avatar
                src={user.avatar}
                alt={user.displayName || user.username}
                fallback={user.username}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {user.displayName || user.username}
                </div>
                <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Popup */}
      {user && (
        <UserProfilePopup
          isOpen={showProfilePopup}
          onClose={() => setShowProfilePopup(false)}
          triggerRef={profileTriggerRef}
        />
      )}
    </aside>
  );
};
