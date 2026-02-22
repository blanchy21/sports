'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils/client';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showHeader?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl',
};

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  size = 'md',
  showHeader = true,
}) => {
  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'bg-card relative mx-2 my-4 flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-lg border shadow-lg sm:mx-4 sm:my-8 sm:max-h-[calc(100vh-4rem)]',
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        {/* Header */}
        {showHeader && (title || showCloseButton) && (
          <div className="flex shrink-0 items-center justify-between border-b p-4 sm:p-6">
            <div className="min-w-0 flex-1 pr-2">
              {title && (
                <h2
                  id="modal-title"
                  className="text-foreground truncate text-base font-semibold sm:text-lg"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="text-muted-foreground mt-1 text-xs sm:text-sm">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-2 h-8 w-8 shrink-0 p-0 sm:ml-4"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};

// Convenience components for common modal patterns
export const ModalHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('flex items-center justify-between border-b p-4 sm:p-6', className)}>
    {children}
  </div>
);

export const ModalTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h2 className={cn('text-foreground text-base font-semibold sm:text-lg', className)}>
    {children}
  </h2>
);

export const ModalDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <p className={cn('text-muted-foreground mt-1 text-xs sm:text-sm', className)}>{children}</p>
);

export const ModalContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => <div className={cn('p-4 sm:p-6', className)}>{children}</div>;

export const ModalFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={cn(
      'bg-muted/30 flex flex-col-reverse items-center justify-end gap-2 border-t p-4 sm:flex-row sm:gap-3 sm:p-6',
      className
    )}
  >
    {children}
  </div>
);
