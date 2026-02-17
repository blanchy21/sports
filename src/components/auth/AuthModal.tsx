import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BaseModal } from '@/components/core/BaseModal';
import { EmailAuthForm } from './EmailAuthForm';
import { HiveAuthSection } from './HiveAuthSection';
import { AuthModalProps } from './types';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Clear error message when modal opens/closes or mode changes
  useEffect(() => {
    setErrorMessage(null);
  }, [isOpen, isLoginMode]);

  const handleToggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setErrorMessage(null);
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
  };

  const handleSuccess = () => {
    setIsConnecting(false);
    onClose();
    router.push('/sportsbites');
  };

  const handleEmailSuccess = () => {
    handleSuccess();
  };

  const handleHiveSuccess = () => {
    handleSuccess();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isLoginMode ? 'Login to Sportsblock' : 'Join Sportsblock'}
      size="xl"
      className="max-h-[90vh] overflow-y-auto"
      showCloseButton={true}
    >
      <div className="grid gap-0 md:grid-cols-2">
        {/* Left Column - Email Login/Signup */}
        <EmailAuthForm
          isLoginMode={isLoginMode}
          onToggleMode={handleToggleMode}
          onSuccess={handleEmailSuccess}
          onError={handleError}
        />

        {/* Right Column - Hive Authentication */}
        <HiveAuthSection
          isConnecting={isConnecting}
          errorMessage={errorMessage}
          onError={handleError}
          onSuccess={handleHiveSuccess}
        />
      </div>
    </BaseModal>
  );
};
