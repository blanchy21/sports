'use client';

import { useEffect } from 'react';
import { setupGlobalErrorHandlers } from '@/lib/utils/error-reporting';

/**
 * Client component that initializes global error handlers on mount.
 * This should be included once in the app layout to catch unhandled
 * errors and promise rejections.
 */
export function GlobalErrorHandlerInitializer() {
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return null;
}
