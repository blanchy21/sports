/**
 * Error Reporting Utility
 *
 * Centralized error reporting that can be extended to use
 * external services like Sentry, LogRocket, or Bugsnag.
 *
 * Currently logs to console, with structured data for production monitoring.
 */

import { ErrorInfo } from 'react';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

/**
 * Error context for better debugging
 */
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  username?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  extra?: Record<string, unknown>;
}

/**
 * Error report structure
 */
export interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  severity: ErrorSeverity;
  context: ErrorContext;
}

/**
 * Check if we're in a browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get browser context for error reports
 */
function getBrowserContext(): Partial<ErrorContext> {
  if (!isBrowser) {
    return {};
  }

  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format error for logging
 */
function formatErrorReport(report: ErrorReport): string {
  const lines = [
    `[${report.severity.toUpperCase()}] ${report.message}`,
    report.context.url ? `  URL: ${report.context.url}` : null,
    report.context.component ? `  Component: ${report.context.component}` : null,
    report.context.action ? `  Action: ${report.context.action}` : null,
    report.context.userId ? `  User: ${report.context.userId}` : null,
    report.stack ? `  Stack: ${report.stack.split('\n')[1]?.trim()}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Send error to external service (placeholder for Sentry, etc.)
 * Extend this function when adding a service like Sentry
 */
async function sendToExternalService(report: ErrorReport): Promise<void> {
  // Placeholder for external service integration
  // Example Sentry integration:
  // if (typeof Sentry !== 'undefined') {
  //   Sentry.captureException(new Error(report.message), {
  //     level: report.severity,
  //     contexts: { error: report.context },
  //     extra: { componentStack: report.componentStack },
  //   });
  // }

  // For now, we'll log structured data that can be picked up by log aggregators
  if (process.env.NODE_ENV === 'production') {
    // Structured JSON logging for production (useful for log aggregation)
    console.error(JSON.stringify({
      type: 'error_report',
      ...report,
    }));
  }
}

/**
 * Report an error from React ErrorBoundary
 */
export function reportErrorBoundary(
  error: Error,
  errorInfo: ErrorInfo,
  context: Partial<ErrorContext> = {}
): void {
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack || undefined,
    severity: 'fatal',
    context: {
      ...getBrowserContext(),
      ...context,
    },
  };

  // Always log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[ErrorBoundary]', formatErrorReport(report));
    console.error('Full error:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  // Send to external service in production
  sendToExternalService(report).catch(() => {
    // Silently fail if reporting fails
  });
}

/**
 * Report a general JavaScript error
 */
export function reportError(
  error: Error | string,
  context: Partial<ErrorContext> = {},
  severity: ErrorSeverity = 'error'
): void {
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  const report: ErrorReport = {
    message: errorObj.message,
    stack: errorObj.stack,
    severity,
    context: {
      ...getBrowserContext(),
      ...context,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    console.error(formatErrorReport(report));
  }

  sendToExternalService(report).catch(() => {
    // Silently fail if reporting fails
  });
}

/**
 * Report a warning (non-fatal issue)
 */
export function reportWarning(
  message: string,
  context: Partial<ErrorContext> = {}
): void {
  reportError(message, context, 'warning');
}

/**
 * Report an API error
 */
export function reportApiError(
  error: Error,
  endpoint: string,
  context: Partial<ErrorContext> = {}
): void {
  reportError(error, {
    ...context,
    action: `API call to ${endpoint}`,
  });
}

/**
 * Set up global error handlers
 * Call this once at app initialization
 */
export function setupGlobalErrorHandlers(): void {
  if (!isBrowser) {
    return;
  }

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    reportError(error, { action: 'Unhandled Promise Rejection' }, 'error');
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    // Ignore errors from browser extensions or cross-origin scripts
    if (!event.filename || event.filename.includes('chrome-extension://')) {
      return;
    }

    reportError(
      event.error || new Error(event.message),
      {
        action: 'Global Error Handler',
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      },
      'error'
    );
  });
}
