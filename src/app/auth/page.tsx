'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/core/Button';
import { AuthHero } from './components/AuthHero';
import { ErrorAlert } from './components/ErrorAlert';
import { GoogleAuthSection } from './components/GoogleAuthSection';
import { useAuthPage } from './hooks/useAuthPage';

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  );
}

const providerConfig: Record<string, { name: string; icon: React.ReactNode; description: string }> =
  {
    keychain: {
      name: 'Hive Keychain',
      icon: (
        <Image
          src="/hive-keychain-logo.svg"
          alt="Hive Keychain"
          width={24}
          height={24}
          className="h-6 w-6"
        />
      ),
      description: 'Browser Extension',
    },
    hivesigner: {
      name: 'HiveSigner',
      icon: (
        <Image
          src="/hivesigner-icon.png"
          alt="HiveSigner"
          width={24}
          height={24}
          className="h-6 w-6"
        />
      ),
      description: 'Web Wallet',
    },
  };

function AuthPageContent() {
  const router = useRouter();
  const {
    isConnecting,
    errorMessage,
    successMessage,
    dismissError,
    availableProviders,
    isWalletReady,
    showHiveUsernameInput,
    hiveUsername,
    onHiveUsernameChange,
    onHiveUsernameSubmit,
    onHiveUsernameCancel,
    onProviderSelect,
    handleGoogleSignIn,
  } = useAuthPage();

  return (
    <div className="min-h-screen bg-background">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute left-0 top-0 z-20 p-6"
      >
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </motion.div>

      <div className="flex min-h-screen">
        {/* Left side - Hero */}
        <AuthHero />

        {/* Right side - Auth forms */}
        <div className="flex w-full items-center justify-center p-6 sm:p-8 lg:w-1/2 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Mobile brand header */}
            <div className="mb-8 text-center lg:hidden">
              <h1 className="mb-2 text-3xl font-black tracking-tight">
                <span className="text-foreground">SPORTS</span>
                <span className="bg-gradient-to-r from-accent to-aegean-sky bg-clip-text text-transparent">
                  BLOCK
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">The arena where your passion pays off</p>
            </div>

            {/* Heading */}
            <div className="mb-8 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mb-2 text-2xl font-bold text-foreground sm:text-3xl"
              >
                Welcome Back
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="text-muted-foreground"
              >
                Sign in to continue your journey
              </motion.p>
            </div>

            {/* Alerts */}
            {errorMessage && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <ErrorAlert message={errorMessage} onDismiss={dismissError} />
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/50"
              >
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">{successMessage}</p>
                </div>
                <button
                  onClick={dismissError}
                  className="text-lg leading-none text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
                >
                  &times;
                </button>
              </motion.div>
            )}

            {/* Hive Wallet Connect Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="mb-8"
            >
              <div className="relative">
                {/* Recommended badge */}
                <div className="absolute -top-3 left-4 z-10">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-accent/25">
                    <Sparkles className="h-3 w-3" />
                    Recommended
                  </span>
                </div>

                <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6 pt-8">
                  <div className="mb-5 text-center">
                    <h3 className="mb-1 text-lg font-semibold text-foreground">
                      Connect with Hive
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Full access with earning capabilities
                    </p>
                  </div>

                  {/* Username input for Keychain */}
                  {showHiveUsernameInput && (
                    <div className="mb-4 rounded-lg border border-primary/20 bg-background p-4">
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Enter your Hive username
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={hiveUsername}
                          onChange={(e) => onHiveUsernameChange(e.target.value)}
                          placeholder="e.g., blanchy"
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          onKeyDown={(e) => e.key === 'Enter' && onHiveUsernameSubmit()}
                          autoFocus
                        />
                        <Button
                          onClick={onHiveUsernameSubmit}
                          disabled={!hiveUsername.trim() || isConnecting}
                          size="sm"
                        >
                          {isConnecting ? 'Connecting...' : 'Connect'}
                        </Button>
                      </div>
                      <button
                        onClick={onHiveUsernameCancel}
                        className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Provider buttons */}
                  <div className="space-y-3">
                    {availableProviders.map((provider) => {
                      const config = providerConfig[provider];
                      if (!config) return null;
                      return (
                        <Button
                          key={provider}
                          onClick={() => onProviderSelect(provider)}
                          disabled={isConnecting || !isWalletReady}
                          className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90 hover:shadow-primary/30"
                        >
                          {config.icon}
                          <div className="flex flex-col items-start">
                            <span>{config.name}</span>
                            <span className="text-xs font-normal opacity-80">
                              {config.description}
                            </span>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="relative mb-8"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-4 text-muted-foreground">
                  Or continue with Google
                </span>
              </div>
            </motion.div>

            {/* Google Auth Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <GoogleAuthSection isConnecting={isConnecting} onGoogleSignIn={handleGoogleSignIn} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
