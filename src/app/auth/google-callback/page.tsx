'use client';

import { useEffect, useRef } from 'react';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Client-side Google OAuth callback page.
 *
 * After Google sign-in, NextAuth sets the JWT session cookie and redirects here.
 * We read the session client-side via getSession() and route:
 * - New user (no hiveUsername) -> /onboarding/username
 * - Existing user, onboarding incomplete -> /onboarding/guide
 * - Existing user, onboarding complete -> /sportsbites
 * - No session after retries -> /auth (sign-in failed)
 *
 * Using a client page instead of a route handler avoids the issue where
 * getServerSession() can't read cookies set during the same redirect chain
 * in Next.js App Router.
 */
export default function GoogleCallbackPage() {
  const router = useRouter();
  const hasRouted = useRef(false);

  useEffect(() => {
    if (hasRouted.current) return;

    const resolveRoute = async () => {
      // Retry a few times — the session cookie may take a moment to be readable
      let session = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        session = await getSession();
        if (session?.user?.id) break;
        // Wait before retrying (200ms, 400ms, 600ms, 800ms)
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }

      if (!session?.user?.id) {
        // No session after retries — sign-in failed
        router.replace('/auth');
        return;
      }

      hasRouted.current = true;

      const user = session.user as {
        hiveUsername?: string;
        onboardingCompleted?: boolean;
      };

      if (!user.hiveUsername) {
        router.replace('/onboarding/username');
      } else {
        // User has a Hive account — go straight to the app
        // (key download is optional, available in Settings)
        router.replace('/sportsbites');
      }
    };

    resolveRoute();
  }, [router]);

  // Minimal loading state — user sees this briefly during redirect
  return (
    <div className="flex min-h-screen items-center justify-center bg-sb-void">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-sb-teal border-t-transparent" />
        <p className="text-sm text-sb-text-muted">Setting up your account...</p>
      </div>
    </div>
  );
}
