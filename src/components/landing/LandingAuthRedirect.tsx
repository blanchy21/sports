'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Non-blocking auth redirect for the landing page.
 * Handles edge case of client-side navigation to "/" while logged in.
 * Middleware handles the primary redirect on initial page load.
 */
export function LandingAuthRedirect() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace('/new');
  }, [user, router]);

  return null;
}
