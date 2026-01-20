"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BaseModal } from "@/components/ui/BaseModal";
import { Button } from "@/components/ui/Button";
import { useKeychainLogin } from "@/hooks/useKeychainLogin";
import { CheckCircle, XCircle, ExternalLink, X, Loader2 } from "lucide-react";

interface KeychainLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const KeychainLoginModal: React.FC<KeychainLoginModalProps> = ({
  isOpen,
  onClose,
}) => {
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
      if (e.key === "Enter" && hiveUsername.trim() && !isConnecting) {
        performKeychainLogin();
      }
    },
    [hiveUsername, isConnecting, performKeychainLogin]
  );

  const handleAlternativeLogin = useCallback(() => {
    onClose();
    router.push("/auth");
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
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-3">
          <Image
            src="/hive-keychain-logo.svg"
            alt="Hive Keychain"
            width={32}
            height={32}
            className="rounded-md"
          />
          <h2 className="text-lg font-semibold text-foreground">
            Sign in with Hive Keychain
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Keychain Status */}
        <div className="flex items-center gap-2 text-sm">
          {isKeychainAvailable ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">
                Hive Keychain extension detected
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground">
                Hive Keychain not detected
              </span>
              <a
                href="https://hive-keychain.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Install
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>

        {/* Username Input */}
        <div className="space-y-2">
          <label
            htmlFor="hive-username"
            className="block text-sm font-medium text-foreground"
          >
            Hive Username
          </label>
          <input
            ref={inputRef}
            id="hive-username"
            type="text"
            value={hiveUsername}
            onChange={(e) => setHiveUsername(e.target.value.toLowerCase())}
            onKeyDown={handleKeyDown}
            placeholder="Enter your Hive username"
            className="w-full px-4 py-3 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
            disabled={isConnecting}
            autoComplete="username"
          />
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive flex-1">{errorMessage}</p>
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
          className="w-full py-6 text-base font-medium"
          size="lg"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect with Keychain"
          )}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        {/* Alternative Login */}
        <Button
          variant="outline"
          onClick={handleAlternativeLogin}
          className="w-full"
        >
          Alternative login methods
        </Button>
      </div>
    </BaseModal>
  );
};
