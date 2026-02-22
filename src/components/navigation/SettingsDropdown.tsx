'use client';

import React, { useRef, useEffect } from 'react';
import { Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const { theme, setTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="border-border bg-card absolute top-full right-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border shadow-lg"
      data-testid="settings-dropdown"
    >
      {/* Header */}
      <div className="border-border bg-muted/50 border-b p-4">
        <div className="flex items-center space-x-2">
          <Settings className="text-muted-foreground h-5 w-5" />
          <h3 className="text-foreground font-semibold">Settings</h3>
        </div>
      </div>

      {/* Settings Options */}
      <div className="p-2">
        {/* Theme Toggle */}
        <div className="hover:bg-muted/50 rounded-lg p-3 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {theme === 'dark' ? (
                <Moon className="text-muted-foreground h-5 w-5" />
              ) : (
                <Sun className="text-muted-foreground h-5 w-5" />
              )}
              <div>
                <p className="text-foreground text-sm font-medium">Appearance</p>
                <p className="text-muted-foreground text-xs">
                  {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`focus:ring-primary relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-hidden ${
                theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
