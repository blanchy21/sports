'use client';

import { useEffect } from 'react';
import { initializeServiceWorker } from '@/lib/serviceWorker';

export const ServiceWorkerInitializer: React.FC = () => {
  useEffect(() => {
    // Initialize service worker
    initializeServiceWorker().catch(console.error);
  }, []);

  return null; // This component doesn't render anything
};
