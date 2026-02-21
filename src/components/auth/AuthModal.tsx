import React, { useState, useEffect } from 'react';
import { BaseModal } from '@/components/core/BaseModal';
import { HiveAuthSection } from './HiveAuthSection';
import { AuthModalProps } from './types';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Clear error message when modal opens/closes
  useEffect(() => {
    setErrorMessage(null);
  }, [isOpen]);

  const handleError = (message: string) => {
    setErrorMessage(message);
  };

  const handleSuccess = () => {
    setIsConnecting(false);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Login to Sportsblock"
      size="xl"
      className="max-h-[90vh] overflow-y-auto"
      showCloseButton={true}
    >
      <HiveAuthSection
        isConnecting={isConnecting}
        errorMessage={errorMessage}
        onError={handleError}
        onSuccess={handleSuccess}
      />
    </BaseModal>
  );
};
