'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Wallet, CheckCircle, Sparkles } from 'lucide-react';
import { KeyTypes } from '@aioha/aioha';
import { AiohaModal } from '@aioha/react-ui';
import { Button } from '@/components/core/Button';
import { useAioha } from '@/contexts/AiohaProvider';
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

function AuthPageContent() {
  const router = useRouter();
  const { aioha } = useAioha();
  const {
    isConnecting,
    errorMessage,
    successMessage,
    dismissError,
    showAiohaModal,
    setShowAiohaModal,
    handleAiohaModalLogin,
    handleGoogleSignIn,
  } = useAuthPage();

  // Determine if this is a sign-up flow (from "Sign Up Free" or "Quick Start" CTAs)
  const searchParams = useSearchParams();
  const isSignUp = searchParams.get('mode') === 'signup';
  const heading = isSignUp ? 'Get Started' : 'Welcome Back';
  const subheading = isSignUp ? 'Create your free account' : 'Sign in to continue your journey';

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
                {heading}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="text-muted-foreground"
              >
                {subheading}
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

                  <Button
                    onClick={() => setShowAiohaModal(true)}
                    disabled={isConnecting || !aioha}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90 hover:shadow-primary/30"
                  >
                    <Wallet className="h-5 w-5" />
                    <span>Connect Hive Wallet</span>
                  </Button>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {['Keychain', 'HiveSigner', 'HiveAuth', 'Ledger'].map((wallet) => (
                      <span
                        key={wallet}
                        className="rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground"
                      >
                        {wallet}
                      </span>
                    ))}
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

      {/* AiohaModal handles all Hive wallet authentication */}
      {Boolean(aioha) && (
        <AiohaModal
          displayed={showAiohaModal}
          loginTitle="Connect to Sportsblock"
          arrangement="grid"
          loginOptions={{
            msg: 'Login to Sportsblock',
            keyType: KeyTypes.Posting,
          }}
          onLogin={handleAiohaModalLogin}
          onClose={setShowAiohaModal}
        />
      )}
    </div>
  );
}
