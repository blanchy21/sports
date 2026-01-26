"use client";

import React, { Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, CheckCircle, Sparkles } from "lucide-react";
import { KeyTypes } from "@aioha/aioha";
import { AiohaModal } from "@aioha/react-ui";
import { Button } from "@/components/ui/Button";
import { useAioha } from "@/contexts/AiohaProvider";
import { AuthHero } from "./components/AuthHero";
import { ErrorAlert } from "./components/ErrorAlert";
import { EmailAuthSection } from "./components/EmailAuthSection";
import { useAuthPage } from "./hooks/useAuthPage";

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
    mode,
    toggleMode,
    isConnecting,
    errorMessage,
    successMessage,
    dismissError,
    showAiohaModal,
    setShowAiohaModal,
    handleAiohaModalLogin,
    emailForm,
    updateEmailField,
    togglePasswordVisibility,
    handleEmailSubmit,
    handleGoogleSignIn,
    handleForgotPassword,
  } = useAuthPage();

  return (
    <div className="min-h-screen bg-background">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute top-0 left-0 z-20 p-6"
      >
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </motion.div>

      <div className="flex min-h-screen">
        {/* Left side - Hero */}
        <AuthHero />

        {/* Right side - Auth forms */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Mobile brand header */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-black tracking-tight mb-2">
                <span className="text-foreground">SPORTS</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-aegean-sky">
                  BLOCK
                </span>
              </h1>
              <p className="text-muted-foreground text-sm">
                The arena where your passion pays off
              </p>
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
              >
                {mode === "login" ? "Welcome Back" : "Join the Arena"}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="text-muted-foreground"
              >
                {mode === "login"
                  ? "Sign in to continue your journey"
                  : "Create your account and start earning"}
              </motion.p>
            </div>

            {/* Alerts */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <ErrorAlert message={errorMessage} onDismiss={dismissError} />
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3"
              >
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-emerald-800 dark:text-emerald-200 text-sm">
                    {successMessage}
                  </p>
                </div>
                <button
                  onClick={dismissError}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 text-lg leading-none"
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
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent text-white text-xs font-semibold rounded-full shadow-lg shadow-accent/25">
                    <Sparkles className="h-3 w-3" />
                    Recommended
                  </span>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20 rounded-2xl p-6 pt-8">
                  <div className="text-center mb-5">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      Connect with Hive
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Full access with earning capabilities
                    </p>
                  </div>

                  <Button
                    onClick={() => setShowAiohaModal(true)}
                    disabled={isConnecting || !aioha}
                    className="w-full h-14 flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02]"
                  >
                    <Wallet className="h-5 w-5" />
                    <span>Connect Hive Wallet</span>
                  </Button>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {["Keychain", "HiveSigner", "HiveAuth", "Ledger"].map(
                      (wallet) => (
                        <span
                          key={wallet}
                          className="px-2 py-1 bg-muted/50 text-muted-foreground text-xs rounded-md"
                        >
                          {wallet}
                        </span>
                      )
                    )}
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
                <span className="px-4 bg-background text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </motion.div>

            {/* Email Auth Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <EmailAuthSection
                mode={mode}
                values={emailForm}
                isConnecting={isConnecting}
                onFieldChange={updateEmailField}
                onSubmit={handleEmailSubmit}
                onToggleMode={toggleMode}
                onTogglePasswordVisibility={togglePasswordVisibility}
                onGoogleSignIn={handleGoogleSignIn}
                onForgotPassword={handleForgotPassword}
              />
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
            msg: "Login to Sportsblock",
            keyType: KeyTypes.Posting,
          }}
          onLogin={handleAiohaModalLogin}
          onClose={setShowAiohaModal}
        />
      )}
    </div>
  );
}
