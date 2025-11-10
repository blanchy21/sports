import React from "react";

interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onDismiss }) => (
  <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
    <p className="text-destructive text-sm">{message}</p>
    <button
      onClick={onDismiss}
      className="text-destructive/80 hover:text-destructive text-xs mt-1 underline"
    >
      Dismiss
    </button>
  </div>
);

export default ErrorAlert;

