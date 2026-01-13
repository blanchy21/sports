// Shared types for authentication components

export interface AuthFormData {
  email: string;
  password: string;
  username: string;
  acceptTerms: boolean;
  subscribeNewsletter: boolean;
}

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface EmailAuthFormProps {
  isLoginMode: boolean;
  onToggleMode: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export interface HiveAuthSectionProps {
  isConnecting: boolean;
  errorMessage: string | null;
  onError: (message: string) => void;
  onSuccess: () => void;
}

export interface AuthFormState {
  email: string;
  password: string;
  username: string;
  acceptTerms: boolean;
  subscribeNewsletter: boolean;
  showPassword: boolean;
}
