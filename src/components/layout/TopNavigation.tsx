'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  Bell,
  Plus,
  Settings,
  Zap,
  Users,
  Search,
  X,
  Menu,
  Newspaper,
  Swords,
} from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import {
  LazyAuthModal,
  LazySportsFilterPopup,
  LazyUpgradeFlow,
  LazyNotificationDropdown,
  LazySettingsDropdown,
  LazyLatestNewsDropdown,
} from '@/components/lazy/LazyComponents';
import { UpgradePrompt } from '@/components/user/AccountBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils/client';
import { logger } from '@/lib/logger';
import { fetchUserAccount } from '@/lib/hive-workerbee/account';

type SearchResult = {
  username: string;
  displayName: string;
  avatar?: string;
  reputation?: string;
  followers: number;
  following: number;
  isHiveUser?: boolean;
};

export const TopNavigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [showSportsPopup, setShowSportsPopup] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUpgradeFlow, setShowUpgradeFlow] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const newsButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleSportSelect = (sportId: string) => {
    setSelectedSport(sportId);
    // Dispatch event to notify other components (session-only, not persisted)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sportFilterChanged', { detail: sportId }));
    }
  };

  // Search functionality - searches both Hive and soft users
  React.useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      if (searchQuery && searchQuery.length >= 3) {
        setIsSearching(true);
        try {
          const results: SearchResult[] = [];

          // Search Hive and soft users in parallel
          // Note: fetchUserAccount is server-side and doesn't accept AbortSignal
          const [hiveResult, softResult] = await Promise.allSettled([
            // Hive user search
            fetchUserAccount(searchQuery).catch(() => null),
            // Soft user search via API (supports abort)
            fetch(`/api/soft/users?search=${encodeURIComponent(searchQuery)}`, {
              signal: controller.signal,
            })
              .then((r) => (r.ok ? r.json() : { users: [] }))
              .catch(() => ({ users: [] })),
          ]);

          // If aborted while waiting, don't update state
          if (controller.signal.aborted) return;

          // Add Hive user if found
          if (hiveResult.status === 'fulfilled' && hiveResult.value) {
            const accountData = hiveResult.value;
            results.push({
              username: searchQuery,
              displayName: accountData.profile?.name || searchQuery,
              avatar: accountData.profile?.profileImage,
              reputation: accountData.reputationFormatted,
              followers: accountData.stats?.followers || 0,
              following: accountData.stats?.following || 0,
              isHiveUser: true,
            });
          }

          // Add soft users if found
          if (softResult.status === 'fulfilled' && softResult.value?.users?.length > 0) {
            softResult.value.users.forEach(
              (user: { username: string; displayName: string; avatarUrl?: string }) => {
                // Don't add if we already have this user from Hive
                if (
                  !results.some((r) => r.username.toLowerCase() === user.username.toLowerCase())
                ) {
                  results.push({
                    username: user.username,
                    displayName: user.displayName || user.username,
                    avatar: user.avatarUrl,
                    followers: 0,
                    following: 0,
                    isHiveUser: false,
                  });
                }
              }
            );
          }

          if (!controller.signal.aborted) {
            setSearchResults(results);
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            logger.error('Search error', 'TopNavigation', error);
            setSearchResults([]);
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleUserClick = (username: string) => {
    window.location.href = `/user/${username}`;
    setShowSearch(false);
    setSearchQuery('');
  };

  return (
    <header className="from-primary to-bright-cobalt sticky top-0 z-50 w-full border-b bg-linear-to-r shadow-md">
      <div className="h-16 sm:h-20 lg:h-24">
        <div className="relative flex h-full items-center px-4 sm:px-6">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="mr-2 h-10 w-10 text-white/90 hover:bg-white/20 hover:text-white lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Left - Logo */}
          <div className="shrink-0 lg:w-80">
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
                className="h-10 w-10 sm:h-14 sm:w-14 lg:h-18 lg:w-18"
                unoptimized
              />
              <div className="hidden text-xl font-bold text-white sm:block sm:text-2xl lg:text-4xl">
                Sportsblock
              </div>
            </Link>
          </div>

          {/* Center - Navigation (desktop only) */}
          <div className="hidden flex-1 justify-center lg:flex">
            <nav className="flex items-center space-x-4 xl:space-x-6">
              <Link
                href="/"
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg px-4 py-2 transition-all duration-200 xl:px-5 xl:py-3',
                  pathname === '/'
                    ? 'bg-card text-primary shadow-md'
                    : 'text-white/90 hover:bg-white/20 hover:text-white'
                )}
                suppressHydrationWarning
              >
                <Home className="h-6 w-6 xl:h-8 xl:w-8" />
                <span className="mt-0.5 text-[10px] font-medium xl:text-xs">Home</span>
              </Link>

              <Link
                href="/dashboard"
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg px-4 py-2 transition-all duration-200 xl:px-5 xl:py-3',
                  pathname === '/dashboard'
                    ? 'bg-card text-primary shadow-md'
                    : 'text-white/90 hover:bg-white/20 hover:text-white'
                )}
                suppressHydrationWarning
              >
                <LayoutDashboard className="h-6 w-6 xl:h-8 xl:w-8" />
                <span className="mt-0.5 text-[10px] font-medium xl:text-xs">Dashboard</span>
              </Link>

              <Link
                href="/communities"
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg px-4 py-2 transition-all duration-200 xl:px-5 xl:py-3',
                  pathname === '/communities'
                    ? 'bg-card text-primary shadow-md'
                    : 'text-white/90 hover:bg-white/20 hover:text-white'
                )}
                suppressHydrationWarning
              >
                <Users className="h-6 w-6 xl:h-8 xl:w-8" />
                <span className="mt-0.5 text-[10px] font-medium xl:text-xs">Community</span>
              </Link>

              {/* Latest News Button */}
              <div className="relative">
                <Button
                  ref={newsButtonRef}
                  variant="ghost"
                  onClick={() => setShowNews(!showNews)}
                  className="flex h-auto flex-col items-center justify-center rounded-lg px-4 py-2 text-white/90 transition-all duration-200 hover:bg-white/20 hover:text-white xl:px-5 xl:py-3"
                >
                  <Newspaper className="h-6 w-6 xl:h-8 xl:w-8" />
                  <span className="mt-0.5 text-[10px] font-medium xl:text-xs">News</span>
                </Button>

                <LazyLatestNewsDropdown
                  isOpen={showNews}
                  onClose={() => setShowNews(false)}
                  triggerRef={newsButtonRef}
                />
              </div>

              {/* Sports Filter Button */}
              <Button
                variant="ghost"
                onClick={() => setShowSportsPopup(true)}
                className="flex h-auto flex-col items-center justify-center rounded-lg px-4 py-2 text-white/90 transition-all duration-200 hover:bg-white/20 hover:text-white xl:px-5 xl:py-3"
              >
                <Zap className="h-6 w-6 xl:h-8 xl:w-8" />
                <span className="mt-0.5 text-[10px] font-medium xl:text-xs">Sports</span>
              </Button>
            </nav>
          </div>

          {/* Right - User Actions */}
          <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4 lg:w-auto lg:flex-none xl:w-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
              className="h-10 w-10 text-white/90 hover:bg-white/20 hover:text-white sm:h-12 sm:w-12 lg:h-16 lg:w-16"
              aria-label="Search"
            >
              <Search className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
            </Button>

            {user ? (
              <>
                <div className="relative">
                  <Button
                    ref={notificationButtonRef}
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative h-10 w-10 text-white/90 hover:bg-white/20 hover:text-white sm:h-12 sm:w-12 lg:h-16 lg:w-16"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-red-500 px-1 text-xs text-[10px] text-white sm:h-5 sm:min-w-5 sm:text-xs">
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
                    className="h-10 w-10 text-white/90 hover:bg-white/20 hover:text-white sm:h-12 sm:w-12 lg:h-16 lg:w-16"
                    aria-label="Create new post"
                  >
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                  </Button>
                </Link>

                <div className="relative hidden lg:block">
                  <Button
                    ref={settingsButtonRef}
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(!showSettings)}
                    className="h-12 w-12 text-white/90 hover:bg-white/20 hover:text-white xl:h-16 xl:w-16"
                    aria-label="Settings"
                  >
                    <Settings className="h-6 w-6 xl:h-8 xl:w-8" />
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
                    <div className="text-base font-semibold text-white lg:text-lg">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-xs text-white/70 lg:text-sm">@{user.username}</div>
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/auth')}
                  className="text-primary hover:text-primary/80 hidden border-white bg-white text-xs font-medium hover:bg-white/90 sm:flex sm:text-sm"
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push('/auth')}
                  className="text-primary bg-white text-xs font-medium hover:bg-white/90 sm:text-sm"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="from-primary to-bright-cobalt border-t border-white/20 bg-linear-to-r lg:hidden">
          <nav className="flex flex-col space-y-2 p-4">
            <Link
              href="/"
              onClick={() => setShowMobileMenu(false)}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-4 py-3 transition-all duration-200',
                pathname === '/' ? 'bg-card text-primary' : 'text-white/90 hover:bg-white/20'
              )}
            >
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>

            <Link
              href="/sportsbites"
              onClick={() => setShowMobileMenu(false)}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-4 py-3 transition-all duration-200',
                pathname === '/sportsbites'
                  ? 'bg-card text-primary'
                  : 'text-white/90 hover:bg-white/20'
              )}
            >
              <Zap className="h-5 w-5" />
              <span>Sportsbites</span>
            </Link>

            <Link
              href="/communities"
              onClick={() => setShowMobileMenu(false)}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-4 py-3 transition-all duration-200',
                pathname === '/communities'
                  ? 'bg-card text-primary'
                  : 'text-white/90 hover:bg-white/20'
              )}
            >
              <Users className="h-5 w-5" />
              <span>Communities</span>
            </Link>

            <Link
              href="/match-threads"
              onClick={() => setShowMobileMenu(false)}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-4 py-3 transition-all duration-200',
                pathname === '/match-threads'
                  ? 'bg-card text-primary'
                  : 'text-white/90 hover:bg-white/20'
              )}
            >
              <Swords className="h-5 w-5" />
              <span>Match Threads</span>
            </Link>

            <button
              onClick={() => {
                setShowMobileMenu(false);
                setShowNews(true);
              }}
              className="flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-left text-white/90 transition-all duration-200 hover:bg-white/20"
            >
              <Newspaper className="h-5 w-5" />
              <span>Latest News</span>
            </button>

            <button
              onClick={() => {
                setShowMobileMenu(false);
                setShowSportsPopup(true);
              }}
              className="flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-left text-white/90 transition-all duration-200 hover:bg-white/20"
            >
              <Zap className="h-5 w-5" />
              <span>Choose Sport</span>
            </button>

            {user && (
              <>
                <Link
                  href="/publish"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 rounded-lg px-4 py-3 text-white/90 transition-all duration-200 hover:bg-white/20"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Post</span>
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 rounded-lg px-4 py-3 text-white/90 transition-all duration-200 hover:bg-white/20"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      <LazyAuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <LazySportsFilterPopup
        isOpen={showSportsPopup}
        onClose={() => setShowSportsPopup(false)}
        onSportSelect={handleSportSelect}
        selectedSport={selectedSport}
      />

      <LazyUpgradeFlow isOpen={showUpgradeFlow} onClose={() => setShowUpgradeFlow(false)} />

      {/* Mobile News Dropdown - rendered as modal on mobile */}
      <div className="lg:hidden">
        <LazyLatestNewsDropdown
          isOpen={showNews}
          onClose={() => setShowNews(false)}
          triggerRef={newsButtonRef}
        />
      </div>

      {/* Upgrade Prompt for soft users */}
      {user && !user.isHiveAuth && showUpgradePrompt && (
        <div className="fixed top-20 right-4 z-40 max-w-sm">
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
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSearch(false)} />
          <div className="relative z-10 mx-4 w-full max-w-2xl">
            <div className="bg-card overflow-hidden rounded-lg border shadow-2xl">
              {/* Search Input */}
              <div className="flex items-center space-x-4 border-b p-4">
                <Search className="text-muted-foreground h-6 w-6" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-none bg-transparent text-lg outline-hidden"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSearch(false)}
                  className="hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Search Results */}
              <div className="max-h-96 overflow-y-auto p-4">
                {isSearching ? (
                  <div className="text-muted-foreground py-8 text-center">Searching...</div>
                ) : searchQuery.length < 3 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    Start typing to search for users...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.username}
                        onClick={() => handleUserClick(result.username)}
                        className="hover:bg-muted flex w-full items-center space-x-3 rounded-lg p-3 transition-colors"
                      >
                        <Avatar
                          src={result.avatar}
                          fallback={result.username}
                          alt={result.displayName}
                          size="md"
                        />
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-semibold">
                              {result.displayName || result.username}
                            </span>
                            {result.isHiveUser ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-red-500 to-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                <Zap className="h-2.5 w-2.5" />
                                Hive
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                Sportsblock
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground text-sm">@{result.username}</div>
                        </div>
                        <div className="text-muted-foreground text-right text-sm">
                          {result.isHiveUser ? `${result.followers || 0} followers` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    No user found with that username
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
