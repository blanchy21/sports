'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Zap, Target, Users, Menu } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { MobileNavMenu } from './MobileNavMenu';

const tabs = [
  { href: '/new', icon: Home, label: 'Home', matchPaths: ['/', '/new'] },
  { href: '/sportsbites', icon: Zap, label: 'Bites', matchPaths: ['/sportsbites'] },
  { href: '/predictions', icon: Target, label: 'Predictions', matchPaths: ['/predictions'] },
  { href: '/communities', icon: Users, label: 'Communities', matchPaths: ['/communities'] },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);

  const isActive = (matchPaths: readonly string[]) => matchPaths.includes(pathname);

  const tabClass = (active: boolean) =>
    cn(
      'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
      active ? 'text-primary dark:text-white' : 'text-muted-foreground dark:text-white/50'
    );

  return (
    <>
      {/* Menu overlay - slides up from bottom nav */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
            style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <MobileNavMenu onClose={() => setShowMenu(false)} />
          </div>
        </>
      )}

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-white/80 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[hsl(220_25%_8%/0.85)] lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center">
          {tabs.map((tab) => {
            const active = isActive(tab.matchPaths);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={tabClass(active)}
                onClick={() => setShowMenu(false)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className={tabClass(showMenu)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
