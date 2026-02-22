'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: Toast = {
        id,
        duration: 5000,
        ...toast,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto remove toast after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed right-4 top-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700';
      case 'error':
        return 'bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-700';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700';
    }
  };

  return (
    <div
      className={cn(
        'flex max-w-sm items-start space-x-3 rounded-lg border p-4 shadow-xl',
        getBackgroundColor(),
        'duration-300 animate-in slide-in-from-right-full'
      )}
    >
      {getIcon()}
      <div className="min-w-0 flex-1">
        {toast.title && (
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{toast.title}</div>
        )}
        {toast.description && (
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{toast.description}</div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// Utility functions for common toast types
export const toast = {
  success: (title: string, description?: string) => ({
    title,
    description,
    type: 'success' as const,
  }),
  error: (title: string, description?: string) => ({
    title,
    description,
    type: 'error' as const,
  }),
  warning: (title: string, description?: string) => ({
    title,
    description,
    type: 'warning' as const,
  }),
  info: (title: string, description?: string) => ({
    title,
    description,
    type: 'info' as const,
  }),
};
