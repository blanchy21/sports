'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/core/Button';

type ValidationState = 'idle' | 'checking' | 'valid' | 'invalid' | 'taken';

export default function OnboardingUsernamePage() {
  const router = useRouter();
  const { user, isClient, updateUser } = useAuth();
  const [username, setUsername] = useState('');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [reason, setReason] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const suggestionLoaded = useRef(false);
  const sessionChecked = useRef(false);

  // Redirect if not logged in or already has hiveUsername
  // Wait for Google auth bridge if a NextAuth session exists
  useEffect(() => {
    if (!isClient) return;
    if (user?.username) {
      if (user.hiveUsername) {
        router.replace('/onboarding/guide');
      }
      // User is set and has no hiveUsername — stay on this page
      return;
    }
    // No AuthContext user yet — check if a NextAuth session exists
    // (Google auth bridge may still be processing)
    if (!sessionChecked.current) {
      sessionChecked.current = true;
      getSession().then((session) => {
        if (!session?.user) {
          // No NextAuth session either — genuinely not logged in
          router.replace('/auth');
        }
        // NextAuth session exists — Google bridge will set the user shortly
      });
    }
  }, [isClient, user, router]);

  // Auto-suggest username from display name (once)
  useEffect(() => {
    if (suggestionLoaded.current || !user?.displayName) return;
    suggestionLoaded.current = true;

    const base = user.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 13);

    if (base) {
      setUsername(`sb-${base}`);
    }
  }, [user?.displayName]);

  // Debounced availability check
  const checkUsername = useCallback((name: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!name || name.length < 3) {
      setValidationState('idle');
      setReason('');
      return;
    }

    setValidationState('checking');

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hive/check-username?username=${encodeURIComponent(name)}`);
        const json = await res.json();

        if (!json.success) {
          setValidationState('invalid');
          setReason(json.error?.message ?? 'Validation failed');
          return;
        }

        const { valid, available, reason: apiReason } = json.data;

        if (!valid) {
          setValidationState('invalid');
          setReason(apiReason ?? 'Invalid username');
        } else if (!available) {
          setValidationState('taken');
          setReason('This username is already taken');
        } else {
          setValidationState('valid');
          setReason('');
        }
      } catch {
        setValidationState('invalid');
        setReason('Could not check availability. Try again.');
      }
    }, 400);
  }, []);

  // Trigger check when username changes
  useEffect(() => {
    checkUsername(username);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [username, checkUsername]);

  const handleCreate = async () => {
    if (validationState !== 'valid' || isCreating || !user) return;

    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/hive/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const json = await res.json();

      if (!json.success) {
        // Surface critical errors (account created but keys/DB failed) directly
        const msg = json.error?.message ?? 'Account creation failed';
        setError(msg);
        return;
      }

      // Update auth state with the new hiveUsername before navigating
      const createdUsername = json.data?.hiveUsername ?? username;
      updateUser({ hiveUsername: createdUsername });

      // Ensure session cookie is synced before navigating
      // (persistAuthState is debounced — we need the cookie set NOW)
      await fetch('/api/auth/sb-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          authType: 'soft',
          hiveUsername: createdUsername,
          loginAt: Date.now(),
        }),
      });

      // Success — redirect to onboarding guide
      router.replace('/onboarding/guide');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Don't render until client-side
  if (!isClient || !user) return null;

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-black tracking-tight">
            <span className="text-foreground">SPORTS</span>
            <span className="from-accent to-aegean-sky bg-linear-to-r bg-clip-text text-transparent">
              BLOCK
            </span>
          </h1>
          <h2 className="text-foreground mb-2 text-xl font-bold">Choose your Hive username</h2>
          <p className="text-muted-foreground text-sm">
            This creates a real blockchain account. Your username is permanent and cannot be
            changed.
          </p>
        </div>

        {/* Username input */}
        <div className="mb-6">
          <label htmlFor="hive-username" className="text-foreground mb-2 block text-sm font-medium">
            Username
          </label>
          <div className="relative">
            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
              @
            </span>
            <input
              id="hive-username"
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))
              }
              placeholder="your-username"
              maxLength={16}
              className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:ring-accent/20 h-12 w-full rounded-xl border pr-10 pl-8 focus:ring-2 focus:outline-hidden"
              disabled={isCreating}
            />
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              {validationState === 'checking' && (
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              )}
              {validationState === 'valid' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
              {(validationState === 'invalid' || validationState === 'taken') && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>

          {/* Validation feedback */}
          {reason && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-2 text-sm ${
                validationState === 'valid'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {reason}
            </motion.p>
          )}

          {validationState === 'valid' && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-emerald-600 dark:text-emerald-400"
            >
              Username is available
            </motion.p>
          )}

          {/* Rules hint */}
          <p className="text-muted-foreground mt-3 text-xs">
            3-16 characters. Lowercase letters, digits, dashes, and dots. Must start with a letter.
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
          >
            {error}
          </motion.div>
        )}

        {/* Create button */}
        <Button
          onClick={handleCreate}
          disabled={validationState !== 'valid' || isCreating}
          className="bg-accent shadow-accent/20 hover:bg-accent/90 hover:shadow-accent/30 flex h-14 w-full items-center justify-center gap-3 rounded-xl text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:scale-100 disabled:opacity-50"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Creating your account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>

        <p className="text-muted-foreground mt-4 text-center text-xs">
          Your keys are encrypted and stored securely. You can export them at any time.
        </p>
      </motion.div>
    </div>
  );
}
