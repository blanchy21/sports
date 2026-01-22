"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LazyAuthModal, LazySportsFilterPopup, LazyUpgradeFlow, LazyNotificationDropdown, LazySettingsDropdown } from "@/components/lazy/LazyComponents";
import { UpgradePrompt } from "@/components/AccountBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";
import { fetchUserAccount } from "@/lib/hive-workerbee/account";

type SearchResult = {
  username: string;
  displayName: string;
  avatar?: string;
  reputation?: string;
  followers: number;
  following: number;
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
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleSportSelect = (sportId: string) => {
    setSelectedSport(sportId);
    // Store the selected sport in localStorage for persistence (client-side only)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('selectedSport', sportId);
      } catch (error) {
        console.error('Error saving sport filter:', error);
      }
    }
    // You could also emit an event or use a context to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sportFilterChanged', { detail: sportId }));
    }
  };

  // Search functionality
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery && searchQuery.length >= 3) {
        setIsSearching(true);
        try {
          const accountData = await fetchUserAccount(searchQuery);
          if (accountData) {
            setSearchResults([{
              username: searchQuery,
              displayName: accountData.profile?.name || searchQuery,
              avatar: accountData.profile?.profileImage,
              reputation: accountData.reputationFormatted,
              followers: accountData.stats?.followers || 0,
              following: accountData.stats?.following || 0,
            }]);
          } else {
            setSearchResults([]);
          }
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUserClick = (username: string) => {
    window.location.href = `/user/${username}`;
    setShowSearch(false);
    setSearchQuery("");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-primary to-bright-cobalt shadow-md">
      <div className="h-16 sm:h-20 lg:h-24">
        <div className="relative flex h-full items-center px-4 sm:px-6">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden text-white/90 hover:bg-white/20 hover:text-white w-10 h-10 mr-2"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Left - Logo */}
          <div className="flex-shrink-0 lg:w-80">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3" suppressHydrationWarning>
              <Image
                src="/sportsblock-logo.png"
                alt="SportsBlock Logo"
                width={72}
                height={72}
                className="w-10 h-10 sm:w-14 sm:h-14 lg:w-18 lg:h-18"
              />
              <div className="text-xl sm:text-2xl lg:text-4xl font-bold text-white hidden sm:block">
                Sportsblock
              </div>
            </Link>
          </div>

          {/* Center - Navigation (desktop only) */}
          <div className="flex-1 hidden lg:flex justify-center">
            <nav className="flex items-center space-x-4 xl:space-x-8">
              <Link
                href="/"
                className={cn(
                  "flex items-center justify-center w-12 h-12 xl:w-16 xl:h-16 rounded-lg transition-all duration-200",
                  pathname === "/"
                    ? "bg-card text-primary shadow-md"
                    : "text-white/90 hover:bg-white/20 hover:text-white"
                )}
                suppressHydrationWarning
              >
                <Home className="h-6 w-6 xl:h-8 xl:w-8" />
              </Link>

              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center justify-center w-12 h-12 xl:w-16 xl:h-16 rounded-lg transition-all duration-200",
                  pathname === "/dashboard"
                    ? "bg-card text-primary shadow-md"
                    : "text-white/90 hover:bg-white/20 hover:text-white"
                )}
                suppressHydrationWarning
              >
                <LayoutDashboard className="h-6 w-6 xl:h-8 xl:w-8" />
              </Link>

              <Link
                href="/communities"
                className={cn(
                  "flex items-center justify-center w-12 h-12 xl:w-16 xl:h-16 rounded-lg transition-all duration-200",
                  pathname === "/communities"
                    ? "bg-card text-primary shadow-md"
                    : "text-white/90 hover:bg-white/20 hover:text-white"
                )}
                suppressHydrationWarning
              >
                <Users className="h-6 w-6 xl:h-8 xl:w-8" />
              </Link>

              {/* Sports Filter Button */}
              <Button
                variant="ghost"
                onClick={() => setShowSportsPopup(true)}
                className="flex items-center justify-center w-12 h-12 xl:w-16 xl:h-16 text-white/90 hover:bg-white/20 hover:text-white transition-all duration-200 rounded-lg"
              >
                <Zap className="h-6 w-6 xl:h-8 xl:w-8" />
              </Button>
            </nav>
          </div>

          {/* Right - User Actions */}
          <div className="flex-1 lg:flex-none lg:w-auto xl:w-[28rem] flex justify-end items-center space-x-2 sm:space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
              className="text-white/90 hover:bg-white/20 hover:text-white w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16"
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
                    className="text-white/90 hover:bg-white/20 hover:text-white w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 relative"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center animate-pulse text-[10px] sm:text-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
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
                  <Button variant="ghost" size="icon" className="text-white/90 hover:bg-white/20 hover:text-white w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16" aria-label="Create new post">
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                  </Button>
                </Link>

                <div className="relative hidden lg:block">
                  <Button
                    ref={settingsButtonRef}
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-white/90 hover:bg-white/20 hover:text-white w-12 h-12 xl:w-16 xl:h-16"
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

                <Link href="/profile" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity" suppressHydrationWarning>
                  <Avatar
                    src={user.avatar}
                    fallback={user.username}
                    alt={user.displayName || user.username}
                    size="md"
                    className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12"
                  />
                  <div className="hidden xl:flex flex-col">
                    <div className="text-white font-semibold text-base lg:text-lg">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-white/70 text-xs lg:text-sm">
                      @{user.username}
                    </div>
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/auth')}
                  className="hidden sm:flex border-white bg-white text-primary hover:bg-white/90 hover:text-primary/80 font-medium text-xs sm:text-sm"
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push('/auth')}
                  className="bg-white text-primary hover:bg-white/90 font-medium text-xs sm:text-sm"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="lg:hidden border-t border-white/20 bg-gradient-to-r from-primary to-bright-cobalt">
          <nav className="flex flex-col p-4 space-y-2">
            <Link
              href="/"
              onClick={() => setShowMobileMenu(false)}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                pathname === "/"
                  ? "bg-card text-primary"
                  : "text-white/90 hover:bg-white/20"
              )}
            >
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>

            <Link
              href="/dashboard"
              onClick={() => setShowMobileMenu(false)}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                pathname === "/dashboard"
                  ? "bg-card text-primary"
                  : "text-white/90 hover:bg-white/20"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/communities"
              onClick={() => setShowMobileMenu(false)}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                pathname === "/communities"
                  ? "bg-card text-primary"
                  : "text-white/90 hover:bg-white/20"
              )}
            >
              <Users className="h-5 w-5" />
              <span>Communities</span>
            </Link>

            <button
              onClick={() => {
                setShowMobileMenu(false);
                setShowSportsPopup(true);
              }}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white/90 hover:bg-white/20 transition-all duration-200 w-full text-left"
            >
              <Zap className="h-5 w-5" />
              <span>Choose Sport</span>
            </button>

            {user && (
              <>
                <Link
                  href="/publish"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white/90 hover:bg-white/20 transition-all duration-200"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Post</span>
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white/90 hover:bg-white/20 transition-all duration-200"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
      
      <LazyAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <LazySportsFilterPopup
        isOpen={showSportsPopup}
        onClose={() => setShowSportsPopup(false)}
        onSportSelect={handleSportSelect}
        selectedSport={selectedSport}
      />

      <LazyUpgradeFlow
        isOpen={showUpgradeFlow}
        onClose={() => setShowUpgradeFlow(false)}
      />

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
          <div className="relative z-10 w-full max-w-2xl mx-4">
            <div className="bg-card border rounded-lg shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="p-4 border-b flex items-center space-x-4">
                <Search className="h-6 w-6 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-lg"
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
              <div className="p-4 max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Searching...
                  </div>
                ) : searchQuery.length < 3 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Start typing to search for users...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.username}
                        onClick={() => handleUserClick(result.username)}
                        className="w-full flex items-center space-x-3 p-3 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Avatar
                          src={result.avatar}
                          fallback={result.username}
                          alt={result.displayName}
                          size="md"
                        />
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-foreground">
                            {result.displayName || result.username}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            @{result.username}
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {result.followers || 0} followers
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
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
