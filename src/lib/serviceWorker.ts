import { logger } from '@/lib/logger';

// Service Worker registration and management
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, prompt user to refresh
            if (confirm('New version available! Refresh to update?')) {
              window.location.reload();
            }
          }
        });
      }
    });

    return registration;
  } catch (error) {
    logger.error('Service Worker registration failed', 'serviceWorker', error);
    return null;
  }
};

// Unregister service worker (for development)
export const unregisterServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch (error) {
    logger.error('Failed to unregister Service Workers', 'serviceWorker', error);
  }
};

// Check if app is running in production
export const isProduction = process.env.NODE_ENV === 'production';

// Initialize service worker
export const initializeServiceWorker = async (): Promise<void> => {
  if (isProduction) {
    await registerServiceWorker();
  } else {
    // Unregister in development to avoid caching issues
    await unregisterServiceWorker();
  }
};
