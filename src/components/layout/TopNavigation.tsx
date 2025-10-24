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
  Moon,
  Sun,
  Zap,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { AuthModal } from "@/components/AuthModal";
import { SportsFilterPopup } from "@/components/SportsFilterPopup";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { UpgradePrompt } from "@/components/AccountBadge";
import { UpgradeFlow } from "@/components/UpgradeFlow";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

export const TopNavigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [showSportsPopup, setShowSportsPopup] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUpgradeFlow, setShowUpgradeFlow] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string>("");
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const handleSportSelect = (sportId: string) => {
    setSelectedSport(sportId);
    // Store the selected sport in localStorage for persistence
    localStorage.setItem('selectedSport', sportId);
    // You could also emit an event or use a context to notify other components
    window.dispatchEvent(new CustomEvent('sportFilterChanged', { detail: sportId }));
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-primary to-bright-cobalt shadow-md">
      <div className="h-24">
        <div className="relative flex h-full items-center">
          {/* Left - Logo (positioned over left sidebar) */}
          <div className="w-80 pl-6">
            <Link href="/" className="flex items-center space-x-3" suppressHydrationWarning>
              <Image
                src="/sportsblock-logo.png"
                alt="SportsBlock Logo"
                width={72}
                height={72}
                className="w-18 h-18"
              />
              <div className="text-4xl font-bold text-white">
                Sportsblock
              </div>
            </Link>
          </div>

          {/* Center - Navigation (positioned over main content) */}
          <div className="flex-1 flex justify-center">
            <nav className="hidden md:flex items-center space-x-8">
          <Link 
            href="/" 
            className={cn(
              "flex items-center justify-center w-16 h-16 rounded-lg transition-all duration-200",
              pathname === "/" 
                ? "bg-card text-primary shadow-md" 
                : "text-white/90 hover:bg-white/20 hover:text-white"
            )}
            suppressHydrationWarning
          >
            <Home className="h-8 w-8" />
          </Link>

          <Link 
            href="/dashboard" 
            className={cn(
              "flex items-center justify-center w-16 h-16 rounded-lg transition-all duration-200",
              pathname === "/dashboard" 
                ? "bg-card text-primary shadow-md" 
                : "text-white/90 hover:bg-white/20 hover:text-white"
            )}
            suppressHydrationWarning
          >
            <LayoutDashboard className="h-8 w-8" />
          </Link>

          <Link 
            href="/communities" 
            className={cn(
              "flex items-center justify-center w-16 h-16 rounded-lg transition-all duration-200",
              pathname === "/communities" 
                ? "bg-card text-primary shadow-md" 
                : "text-white/90 hover:bg-white/20 hover:text-white"
            )}
            suppressHydrationWarning
          >
            <Users className="h-8 w-8" />
          </Link>

          {/* Sports Filter Button */}
          <Button
            variant="ghost"
            onClick={() => setShowSportsPopup(true)}
            className="flex items-center justify-center w-16 h-16 text-white/90 hover:bg-white/20 hover:text-white transition-all duration-200 rounded-lg"
          >
            <Zap className="h-8 w-8" />
          </Button>
          </nav>
          </div>

          {/* Right - User Actions (positioned over right sidebar) */}
          <div className="w-[28rem] pr-6 flex justify-end items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleTheme}
            className="hidden sm:flex text-white/90 hover:bg-white/20 hover:text-white w-16 h-16"
          >
            {theme === "light" ? (
              <Moon className="h-8 w-8" />
            ) : (
              <Sun className="h-8 w-8" />
            )}
          </Button>

          {user ? (
            <>
              <div className="relative">
                <Button 
                  ref={notificationButtonRef}
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-white/90 hover:bg-white/20 hover:text-white w-16 h-16 relative"
                >
                  <Bell className="h-8 w-8" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
                
                <NotificationDropdown
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                  triggerRef={notificationButtonRef}
                />
              </div>
              
              <Link href="/publish" suppressHydrationWarning>
                <Button variant="ghost" size="icon" className="text-white/90 hover:bg-white/20 hover:text-white w-16 h-16">
                  <Plus className="h-8 w-8" />
                </Button>
              </Link>

              <div className="relative">
                <Button variant="ghost" size="icon" className="text-white/90 hover:bg-white/20 hover:text-white w-16 h-16">
                  <Settings className="h-8 w-8" />
                </Button>
              </div>

              <div className="flex items-center space-x-3">
                <Link href="/profile" suppressHydrationWarning className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                  <Avatar
                    src={user.avatar}
                    fallback={user.username}
                    alt={user.displayName || user.username}
                    size="lg"
                    className="w-12 h-12"
                  />
                  <div className="flex flex-col">
                    <div className="text-white font-semibold text-lg">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-white/70 text-sm">
                      @{user.username}
                    </div>
                  </div>
                </Link>
              </div>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/auth')}
                className="border-white bg-white text-primary hover:bg-white/90 hover:text-primary/80 font-medium"
              >
                Sign In
              </Button>
              <Button 
                size="sm"
                onClick={() => router.push('/auth')}
                className="bg-white text-primary hover:bg-white/90 font-medium"
              >
                Get Started
              </Button>
            </>
          )}
          </div>
        </div>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      
      <SportsFilterPopup
        isOpen={showSportsPopup}
        onClose={() => setShowSportsPopup(false)}
        onSportSelect={handleSportSelect}
        selectedSport={selectedSport}
      />

      <UpgradeFlow
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
    </header>
  );
};
