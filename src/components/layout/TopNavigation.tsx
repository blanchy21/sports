'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Bell,
  Plus,
  Settings,
  Zap,
  Target,
  Users,
  Search,
  Menu,
  Newspaper,
} from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import {
  LazyAuthModal,
  LazyUpgradeFlow,
  LazyNotificationDropdown,
  LazySettingsDropdown,
  LazyLatestNewsDropdown,
} from '@/components/lazy/LazyComponents';
import { UpgradePrompt } from '@/components/user/AccountBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils/client';
import { SearchModal } from './SearchModal';
import { MobileNavMenu } from './MobileNavMenu';

export const TopNavigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUpgradeFlow, setShowUpgradeFlow] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const newsButtonRef = useRef<HTMLButtonElement | null>(null);

  const navItemClass = (isActive: boolean) =>
    cn(
      'relative flex flex-col items-center justify-center rounded-lg px-4 py-2 transition-all duration-200 xl:px-5 xl:py-3',
      isActive
        ? 'text-primary after:absolute after:bottom-0 after:left-1/2 after:h-[2px] after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-primary dark:text-white dark:after:bg-white'
        : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white'
    );

  const iconBtnClass =
    'h-10 w-10 text-muted-foreground hover:bg-foreground/5 hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white sm:h-11 sm:w-11 lg:h-11 lg:w-11';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-[hsl(220_25%_8%/0.75)] dark:shadow-none">
      <div className="h-14 sm:h-16 lg:h-[4.5rem]">
        <div className="relative flex h-full items-center px-4 sm:px-6">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="mr-2 h-10 w-10 text-muted-foreground hover:bg-foreground/5 hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Left - Logo */}
          <div className="flex-shrink-0 lg:w-80">
            <Link
              href="/"
              className="flex items-center space-x-2 sm:space-x-3"
              suppressHydrationWarning
            >
              <Image
                src="/sportsblock-logo-trans.png"
                alt="SportsBlock Logo"
                width={72}
                height={72}
                className="lg:w-18 lg:h-18 h-10 w-10 sm:h-14 sm:w-14"
              />
              <div className="hidden text-xl font-bold text-foreground sm:block sm:text-2xl lg:text-3xl">
                Sportsblock
              </div>
            </Link>
          </div>

          {/* Center - Navigation (desktop only) */}
          <div className="hidden flex-1 justify-center lg:flex">
            <nav className="flex items-center space-x-4 xl:space-x-6">
              <Link
                href="/new"
                className={navItemClass(pathname === '/' || pathname === '/new')}
                suppressHydrationWarning
              >
                <Home className="h-5 w-5 xl:h-6 xl:w-6" />
                <span className="mt-0.5 text-[10px] font-medium xl:text-xs">Home</span>
              </Link>

              <Link
                href="/sportsbites"
                className={navItemClass(pathname === '/sportsbites')}
                suppressHydrationWarning
              >
                <Zap className="h-5 w-5 xl:h-6 xl:w-6" />
                <span className="mt-0.5 text-[10px] font-medium xl:text-xs">Sportsbites</span>
              </Link>

              <Link
                href="/predictions"
                className={navItemClass(pathname === '/predictions')}
                suppressHydrationWarning
              >
                <Target className="h-5 w-5 xl:h-6 xl:w-6" />
                <span className="mt-0.5 text-[10px] font-medium xl:text-xs">Predictions</span>
              </Link>

              <Link
                href="/communities"
                className={navItemClass(pathname === '/communities')}
                suppressHydrationWarning
              >
                <Users className="h-5 w-5 xl:h-6 xl:w-6" />
                <span className="mt-0.5 text-[10px] font-medium xl:text-xs">Communities</span>
              </Link>

              {/* Latest News Button */}
              <div className="relative">
                <Button
                  ref={newsButtonRef}
                  variant="ghost"
                  onClick={() => setShowNews(!showNews)}
                  className="flex h-auto flex-col items-center justify-center rounded-lg px-4 py-2 text-muted-foreground transition-all duration-200 hover:bg-foreground/5 hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white xl:px-5 xl:py-3"
                >
                  <Newspaper className="h-5 w-5 xl:h-6 xl:w-6" />
                  <span className="mt-0.5 text-[10px] font-medium xl:text-xs">News</span>
                </Button>

                <LazyLatestNewsDropdown
                  isOpen={showNews}
                  onClose={() => setShowNews(false)}
                  triggerRef={newsButtonRef}
                />
              </div>
            </nav>
          </div>

          {/* Right - User Actions */}
          <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4 lg:w-auto lg:flex-none xl:w-[28rem]">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
              className={iconBtnClass}
              aria-label="Search"
            >
              <Search className="h-5 w-5 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            </Button>

            {user ? (
              <>
                <div className="relative">
                  <Button
                    ref={notificationButtonRef}
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={cn('relative', iconBtnClass)}
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-xs text-white sm:h-5 sm:min-w-5 sm:text-xs">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>

                  <LazyNotificationDropdown
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                    triggerRef={notificationButtonRef}
                  />
                </div>

                <Link href="/publish" className="hidden sm:block">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={iconBtnClass}
                    aria-label="Create new post"
                  >
                    <Plus className="h-5 w-5 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                  </Button>
                </Link>

                <div className="relative hidden lg:block">
                  <Button
                    ref={settingsButtonRef}
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(!showSettings)}
                    className="h-11 w-11 text-muted-foreground hover:bg-foreground/5 hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white xl:h-11 xl:w-11"
                    aria-label="Settings"
                  >
                    <Settings className="h-5 w-5 xl:h-6 xl:w-6" />
                  </Button>

                  <LazySettingsDropdown
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    triggerRef={settingsButtonRef}
                  />
                </div>

                <Link
                  href="/profile"
                  className="flex items-center space-x-2 transition-opacity hover:opacity-80 sm:space-x-3"
                  suppressHydrationWarning
                >
                  <Avatar
                    src={user.avatar}
                    fallback={user.username}
                    alt={user.displayName || user.username}
                    size="md"
                    className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12"
                  />
                  <div className="hidden flex-col xl:flex">
                    <div className="text-base font-semibold text-foreground lg:text-lg">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-xs text-muted-foreground lg:text-sm">@{user.username}</div>
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/auth')}
                  className="hidden border-border bg-transparent text-xs font-medium text-foreground hover:bg-foreground/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10 sm:flex sm:text-sm"
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push('/auth')}
                  className="bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:text-sm"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && <MobileNavMenu onClose={() => setShowMobileMenu(false)} />}

      <LazyAuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <LazyUpgradeFlow isOpen={showUpgradeFlow} onClose={() => setShowUpgradeFlow(false)} />

      {/* Mobile News Dropdown */}
      <div className="lg:hidden">
        <LazyLatestNewsDropdown
          isOpen={showNews}
          onClose={() => setShowNews(false)}
          triggerRef={newsButtonRef}
        />
      </div>

      {/* Upgrade Prompt for soft users */}
      {user && !user.isHiveAuth && showUpgradePrompt && (
        <div className="fixed right-4 top-16 z-40 max-w-sm">
          <UpgradePrompt
            user={user}
            onUpgrade={() => {
              setShowUpgradePrompt(false);
              setShowUpgradeFlow(true);
            }}
            onDismiss={() => setShowUpgradePrompt(false)}
          />
        </div>
      )}

      {/* Search Modal */}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </header>
  );
};
