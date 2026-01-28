'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BaseModal } from '@/components/core/BaseModal';
import { Button } from '@/components/core/Button';
import { useKeychainLogin } from '@/features/auth/hooks/useKeychainLogin';
import { CheckCircle, XCircle, ExternalLink, X, Loader2 } from 'lucide-react';

interface KeychainLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const KeychainLoginModal: React.FC<KeychainLoginModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    hiveUsername,
    setHiveUsername,
    isConnecting,
    errorMessage,
    isKeychainAvailable,
    isAiohaReady,
    performKeychainLogin,
    dismissError,
    resetState,
  } = useKeychainLogin(onClose);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && hiveUsername.trim() && !isConnecting) {
        performKeychainLogin();
      }
    },
    [hiveUsername, isConnecting, performKeychainLogin]
  );

  const handleAlternativeLogin = useCallback(() => {
    router.push('/auth');
    onClose();
  }, [onClose, router]);

  const isLoginDisabled = !hiveUsername.trim() || isConnecting || !isAiohaReady;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      showHeader={false}
      size="sm"
      className="overflow-hidden"
    >
      {/* Custom Header */}
      <div className="relative flex items-center justify-between bg-primary px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <Image
              src="/hive-keychain-logo.svg"
              alt="Hive Keychain"
              width={22}
              height={22}
              className="brightness-0 invert"
            />
          </div>
          <div>
            <h2 className="truncate text-base font-bold text-primary-foreground sm:text-lg">
              Sign in with Keychain
            </h2>
            <p className="text-xs text-primary-foreground/60">Connect your Hive wallet</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 flex-shrink-0 p-0 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-5 p-4 sm:p-6">
        {/* Keychain Status */}
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
          {isKeychainAvailable ? (
            <>
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
              <span className="text-foreground/80">Hive Keychain extension detected</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
              <span className="text-foreground/80">Hive Keychain not detected</span>
              <a
                href="https://hive-keychain.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 font-medium text-accent hover:underline"
              >
                Install
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>

        {/* Username Input */}
        <div className="space-y-2">
          <label htmlFor="hive-username" className="block text-sm font-medium text-foreground">
            Hive Username
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 select-none text-muted-foreground/60">
              @
            </span>
            <input
              ref={inputRef}
              id="hive-username"
              type="text"
              value={hiveUsername}
              onChange={(e) => setHiveUsername(e.target.value.toLowerCase())}
              onKeyDown={handleKeyDown}
              placeholder="username"
              className="w-full rounded-lg border border-border bg-background py-3 pl-9 pr-4 text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              disabled={isConnecting}
              autoComplete="username"
            />
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
            <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <p className="flex-1 text-sm text-destructive">{errorMessage}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissError}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              aria-label="Dismiss error"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Connect Button */}
        <Button
          onClick={performKeychainLogin}
          disabled={isLoginDisabled}
          className="w-full bg-accent py-6 text-base font-semibold text-white shadow-md transition-all hover:bg-accent/90 hover:shadow-lg disabled:bg-accent/40"
          size="lg"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect with Keychain'
          )}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-card px-3 text-muted-foreground/70">Or</span>
          </div>
        </div>

        {/* Alternative Login */}
        <Button
          variant="outline"
          onClick={handleAlternativeLogin}
          className="w-full border-border/60 text-foreground/70 hover:border-accent/40 hover:text-foreground"
        >
          Alternative login methods
        </Button>
      </div>
    </BaseModal>
  );
};
