import React from 'react';

interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onDismiss }) => (
  <div className="mb-6 rounded-lg border border-sb-loss/20 bg-sb-loss/10 p-4">
    <p className="text-sm text-sb-loss">{message}</p>
    <button
      onClick={onDismiss}
      className="mt-1 text-xs text-sb-loss/80 underline hover:text-sb-loss"
    >
      Dismiss
    </button>
  </div>
);

export default ErrorAlert;
