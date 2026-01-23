"use client";

import React, { Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import { KeyTypes } from "@aioha/aioha";
import { AiohaModal } from "@aioha/react-ui";
import { Button } from "@/components/ui/Button";
import { useAioha } from "@/contexts/AiohaProvider";
import { AuthHero } from "./components/AuthHero";
import { AuthHeading } from "./components/AuthHeading";
import { ErrorAlert } from "./components/ErrorAlert";
import { EmailAuthSection } from "./components/EmailAuthSection";
import { useAuthPage } from "./hooks/useAuthPage";

const Divider: React.FC = () => (
  <div className="relative mb-8">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-border" />
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-4 bg-background text-muted-foreground">Or continue with email</span>
    </div>
  </div>
);

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
    dismissError,
    showAiohaModal,
    setShowAiohaModal,
    handleAiohaModalLogin,
    emailForm,
    updateEmailField,
    togglePasswordVisibility,
    handleEmailSubmit,
  } = useAuthPage();

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 z-10 p-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>

      <div className="flex min-h-screen">
        <AuthHero />

        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <AuthHeading mode={mode} />

            {errorMessage && <ErrorAlert message={errorMessage} onDismiss={dismissError} />}

            {/* Hive Wallet Connect Section */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">Connect with Hive Blockchain</h3>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred wallet to access the full Hive ecosystem
                </p>
              </div>

              <Button
                onClick={() => setShowAiohaModal(true)}
                disabled={isConnecting || !aioha}
                className="w-full h-14 flex items-center justify-center space-x-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <Wallet className="h-5 w-5" />
                <span>Connect Hive Wallet</span>
              </Button>

              <p className="mt-3 text-xs text-center text-muted-foreground">
                Supports Keychain, HiveSigner, HiveAuth, Ledger, PeakVault & MetaMask
              </p>
            </div>

            <Divider />

            <EmailAuthSection
              mode={mode}
              values={emailForm}
              isConnecting={isConnecting}
              onFieldChange={updateEmailField}
              onSubmit={handleEmailSubmit}
              onToggleMode={toggleMode}
              onTogglePasswordVisibility={togglePasswordVisibility}
            />
          </div>
        </div>
      </div>

      {/* AiohaModal handles all Hive wallet authentication including HiveAuth QR codes */}
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

