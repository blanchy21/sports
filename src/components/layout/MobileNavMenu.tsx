'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Plus,
  Zap,
  Target,
  Users,
  Swords,
  Moon,
  Sun,
  Compass,
  DollarSign,
  Newspaper,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils/client';

interface MobileNavMenuProps {
  onClose: () => void;
}

const navLinkClass = (isActive: boolean) =>
  cn(
    'flex items-center space-x-3 rounded-lg px-4 py-3 transition-all duration-200',
    isActive
      ? 'bg-primary/10 text-primary dark:bg-white/10 dark:text-white'
      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white'
  );

export function MobileNavMenu({ onClose }: MobileNavMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    onClose();
    await logout();
    router.push('/auth');
  };

  return (
    <div className="border-t border-border/50 bg-white/80 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[hsl(220_25%_8%/0.85)] lg:hidden">
      <nav className="flex flex-col space-y-2 p-4">
        <Link
          href="/new"
          onClick={onClose}
          className={navLinkClass(pathname === '/' || pathname === '/new')}
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <Link
          href="/sportsbites"
          onClick={onClose}
          className={navLinkClass(pathname === '/sportsbites')}
        >
          <Zap className="h-5 w-5" />
          <span>Sportsbites</span>
        </Link>

        <Link
          href="/predictions"
          onClick={onClose}
          className={navLinkClass(pathname === '/predictions')}
        >
          <Target className="h-5 w-5" />
          <span>Predictions</span>
        </Link>

        <Link
          href="/communities"
          onClick={onClose}
          className={navLinkClass(pathname === '/communities')}
        >
          <Users className="h-5 w-5" />
          <span>Communities</span>
        </Link>

        <Link
          href="/match-threads"
          onClick={onClose}
          className={navLinkClass(pathname === '/match-threads')}
        >
          <Swords className="h-5 w-5" />
          <span>Match Threads</span>
        </Link>

        <Link href="/discover" onClick={onClose} className={navLinkClass(pathname === '/discover')}>
          <Compass className="h-5 w-5" />
          <span>Discover</span>
        </Link>

        <Link href="/feed" onClick={onClose} className={navLinkClass(pathname === '/feed')}>
          <Newspaper className="h-5 w-5" />
          <span>Feed</span>
        </Link>

        {user && (
          <>
            <Link
              href="/publish"
              onClick={onClose}
              className="flex items-center space-x-3 rounded-lg px-4 py-3 text-muted-foreground transition-all duration-200 hover:bg-foreground/5 hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <Plus className="h-5 w-5" />
              <span>Create Post</span>
            </Link>

            <Link href="/wallet" onClick={onClose} className={navLinkClass(pathname === '/wallet')}>
              <DollarSign className="h-5 w-5" />
              <span>Wallet</span>
            </Link>

            <Link
              href="/dashboard"
              onClick={onClose}
              className={navLinkClass(pathname === '/dashboard')}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
          </>
        )}

        <button
          onClick={toggleTheme}
          className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-muted-foreground transition-all duration-200 hover:bg-foreground/5 hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
        >
          <div className="flex items-center space-x-3">
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <div
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
            role="switch"
            aria-checked={theme === 'dark'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </div>
        </button>

        {user && (
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-destructive transition-all duration-200 hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout @{user.username}</span>
          </button>
        )}
      </nav>
    </div>
  );
}
