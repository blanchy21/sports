'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * /profile now redirects to /user/{username}.
 * Kept as a file so bookmarked /profile URLs still work.
 */
export default function ProfileRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    if (isLoading) return;

    if (user?.username) {
      router.replace(`/user/${user.username}`);
    } else {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  return null;
}
