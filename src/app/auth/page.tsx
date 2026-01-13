"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthHero } from "./components/AuthHero";
import { AuthHeading } from "./components/AuthHeading";
import { ErrorAlert } from "./components/ErrorAlert";
import { HiveUsernamePrompt } from "./components/HiveUsernamePrompt";
import { HiveWalletSection } from "./components/HiveWalletSection";
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
  const router = useRouter();
  const {
    mode,
    toggleMode,
    isConnecting,
    errorMessage,
    dismissError,
    availableProviders,
    showHiveUsernameInput,
    selectedProvider,
    hiveUsername,
    onHiveUsernameChange,
    onHiveUsernameSubmit,
    onHiveUsernameCancel,
    onProviderSelect,
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

            <HiveUsernamePrompt
              visible={showHiveUsernameInput}
              hiveUsername={hiveUsername}
              selectedProvider={selectedProvider}
              isConnecting={isConnecting}
              onChange={onHiveUsernameChange}
              onSubmit={onHiveUsernameSubmit}
              onCancel={onHiveUsernameCancel}
            />

            <HiveWalletSection
              providers={availableProviders}
              isConnecting={isConnecting}
              onProviderSelect={onProviderSelect}
            />

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

      {/* Note: Using custom UI + programmatic Aioha login instead of AiohaModal */}
    </div>
  );
}

