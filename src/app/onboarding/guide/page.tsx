'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Key,
  Download,
  TrendingUp,
  Shield,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/core/Button';

const STEPS = [
  {
    icon: Globe,
    title: 'Welcome to Hive',
    body: 'You now have a real blockchain account. Your posts, votes, and reputation live on the Hive blockchain — not on our servers. Nobody can censor or delete your content. This account is yours forever.',
  },
  {
    icon: Key,
    title: 'Your Keys = Your Identity',
    body: 'Hive uses cryptographic keys instead of passwords. You have 4 keys — Owner, Active, Posting, and Memo — each with different permissions. Your Owner key is like a master password. Guard it carefully and never share it with anyone.',
  },
  {
    icon: Download,
    title: 'Download & Store Safely',
    body: 'Your keys are encrypted on our server for now, but you should download and store them somewhere safe — a password manager, USB drive, or even a printed copy in a safe place. Once you have them, you have full control.',
    requiresDownload: true,
  },
  {
    icon: TrendingUp,
    title: 'Posting & Rewards',
    body: "When you publish a post or Sportsbite, rewards are paid out 7 days after publishing. Don't worry — we've given you enough posting power to get started. As you earn rewards, stake some back (called \"powering up\") to keep posting. Aim for 100 HP (Hive Power) and you'll be able to post as much as you like.",
  },
  {
    icon: Shield,
    title: 'Hive Keychain & Next Steps',
    body: 'Hive Keychain is a free browser extension that securely stores your keys and signs transactions. Install it, import the keys you just downloaded, and next time you can log into Sportsblock with "Connect Hive Wallet" for full self-custody — no middleman needed.',
    isFinal: true,
  },
] as const;

export default function OnboardingGuidePage() {
  const router = useRouter();
  const { user, isClient, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [keysDownloaded, setKeysDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [completing, setCompleting] = useState(false);
  const sessionChecked = useRef(false);

  // Auth guard: must be logged in with a hiveUsername but not yet completed onboarding
  useEffect(() => {
    if (!isClient) return;
    if (user?.username) {
      if (!user.hiveUsername) {
        router.replace('/onboarding/username');
      }
      return;
    }
    // No AuthContext user yet — check if a NextAuth session exists
    if (!sessionChecked.current) {
      sessionChecked.current = true;
      getSession().then((session) => {
        if (!session?.user) {
          router.replace('/auth');
        }
      });
    }
  }, [isClient, user, router]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      const res = await fetch('/api/hive/download-keys');
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || 'Failed to download keys');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
        'sportsblock-keys.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setKeysDownloaded(true);
      updateUser({ keysDownloaded: true });
    } catch (err) {
      console.error('Key download failed:', err);
      setDownloadError(
        err instanceof Error ? err.message : 'Failed to download keys. Please try again.'
      );
    } finally {
      setDownloading(false);
    }
  }, [updateUser]);

  const handleComplete = useCallback(async () => {
    setCompleting(true);
    try {
      const res = await fetch('/api/hive/complete-onboarding', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to complete onboarding');
      }
      updateUser({ onboardingCompleted: true });
      router.replace('/sportsbites');
    } catch (err) {
      console.error('Onboarding completion failed:', err);
      // Still redirect — the guard will catch them if it truly failed
      router.replace('/sportsbites');
    } finally {
      setCompleting(false);
    }
  }, [router, updateUser]);

  const step = STEPS[currentStep];
  const isDownloadStep = 'requiresDownload' in step && step.requiresDownload;
  const isFinalStep = 'isFinal' in step && step.isFinal;
  const canAdvance = isDownloadStep ? keysDownloaded : true;

  const handleNext = () => {
    if (isFinalStep) {
      handleComplete();
      return;
    }
    if (canAdvance && currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  if (!isClient || !user) return null;

  const Icon = step.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="mb-2 text-3xl font-black tracking-tight">
            <span className="text-foreground">SPORTS</span>
            <span className="bg-gradient-to-r from-accent to-aegean-sky bg-clip-text text-transparent">
              BLOCK
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome, <span className="font-medium text-foreground">@{user.hiveUsername}</span>
          </p>
        </motion.div>

        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                // Allow going back to completed steps, but not forward past gated steps
                if (i < currentStep) setCurrentStep(i);
              }}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-8 bg-accent'
                  : i < currentStep
                    ? 'w-2.5 bg-accent/40 hover:bg-accent/60'
                    : 'w-2.5 bg-muted-foreground/20'
              }`}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-border bg-card p-8"
          >
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <Icon className="h-8 w-8 text-accent" />
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-4 text-center text-xl font-bold text-foreground">
              {step.title}
            </h2>

            {/* Body */}
            <p className="mb-6 text-center text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>

            {/* Step 3: Download action */}
            {isDownloadStep && (
              <div className="mb-6">
                {keysDownloaded ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400"
                  >
                    <Check className="h-5 w-5" />
                    Keys downloaded successfully
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-semibold text-black transition-all hover:bg-amber-400 disabled:opacity-50"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          Download Your Keys
                        </>
                      )}
                    </Button>
                    {downloadError && (
                      <p className="text-center text-xs text-red-400">{downloadError}</p>
                    )}
                    <p className="text-center text-xs text-muted-foreground">
                      You must download your keys to continue
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Keychain links */}
            {isFinalStep && (
              <div className="mb-6 flex flex-col items-center gap-2">
                <div className="flex gap-3">
                  <a
                    href="https://chromewebstore.google.com/detail/hive-keychain/jcacnejopjdphbnjgfaaobbfafkihpep"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                  >
                    Chrome
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href="https://addons.mozilla.org/en-US/firefox/addon/hive-keychain/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                  >
                    Firefox
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  Install Hive Keychain for your browser
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              {currentStep > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <Button
                onClick={handleNext}
                disabled={!canAdvance || completing}
                className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent/90 disabled:opacity-50"
              >
                {completing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finishing...
                  </>
                ) : isFinalStep ? (
                  <>
                    Go to Feed
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Step counter */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
