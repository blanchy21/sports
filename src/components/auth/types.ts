// Shared types for authentication components

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface HiveAuthSectionProps {
  isConnecting: boolean;
  errorMessage: string | null;
  onError: (message: string) => void;
  onSuccess: () => void;
}
