'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, TrendingUp, Users, DollarSign, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/core/Button';
import { Loading } from '@/components/core/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/components/modals/ModalProvider';
import { LazyLandingSections } from '@/components/lazy/LazyLandingContent';

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { openModal } = useModal();
  const { scrollY } = useScroll();

  // Parallax transforms for hero elements
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.9]);
  const parallaxY = useTransform(scrollY, [0, 600], [0, 200]);
  const textY = useTransform(scrollY, [0, 300], [0, 50]);

  // Redirect authenticated users to feed
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/feed');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <Loading fullPage text="Loading..." />;
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative flex min-h-screen items-center justify-center overflow-hidden"
      >
        {/* Dynamic Background with Multiple Layers */}
        <motion.div style={{ y: parallaxY }} className="absolute inset-0 z-0">
          {/* Primary background - dramatic sports action */}
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1461896836934-gy5f7b5sLLKQ?w=1920&q=80')",
            }}
          />
          {/* Fallback gradient if image doesn't load */}
          <div className="absolute inset-0 bg-gradient-to-br from-fibonacci-blue via-bright-cobalt to-fibonacci-blue" />
          {/* Overlay gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
          {/* Accent color overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/10" />
        </motion.div>

        {/* Floating Decorative Elements */}
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
          {/* Animated gradient orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl"
          />
        </div>

        {/* Main Hero Content */}
        <motion.div
          style={{ y: textY }}
          className="relative z-10 mx-auto max-w-6xl px-6 text-center"
        >
          {/* Brand Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
            </span>
            <span className="text-sm font-medium text-white/90">Where Sports Fans Earn</span>
          </motion.div>

          {/* Main Brand Name */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            <h1 className="mb-4 text-6xl font-black tracking-tight sm:text-7xl md:text-8xl lg:text-9xl">
              <span className="text-white">SPORTS</span>
              <span className="bg-gradient-to-r from-accent via-aegean-sky to-accent bg-clip-text text-transparent">
                BLOCK
              </span>
            </h1>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mb-4 max-w-3xl text-xl font-light leading-relaxed text-white/90 sm:text-2xl md:text-3xl"
          >
            The arena where your passion pays off.
          </motion.p>

          {/* Sub-tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mx-auto mb-10 max-w-2xl text-base text-white/60 sm:text-lg"
          >
            Share your takes. Build your reputation. Earn crypto rewards.
            <br className="hidden sm:block" />
            Pure sports content on the blockchain.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              className="group bg-accent px-10 py-7 text-lg font-semibold text-white shadow-2xl shadow-accent/25 transition-all duration-300 hover:scale-105 hover:bg-accent/90 hover:shadow-accent/40"
              onClick={() => openModal('keychainLogin')}
            >
              Sign In with Hive
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/5 px-10 py-7 text-lg text-white backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:bg-white/15"
              onClick={() => router.push('/auth')}
            >
              Sign Up
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-4 text-white/70 sm:gap-8"
          >
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white/10 p-1.5">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-sm">Join thousands on Hive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white/10 p-1.5">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="text-sm">Real crypto earnings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white/10 p-1.5">
                <DollarSign className="h-4 w-4" />
              </div>
              <span className="text-sm">No middlemen</span>
            </div>
          </motion.div>

          {/* Whitepaper Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-6"
          >
            <Link
              href="/whitepaper"
              className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white/80"
            >
              <FileText className="h-4 w-4" />
              Read our Whitepaper
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 transform"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center text-white/50"
          >
            <span className="mb-3 text-xs uppercase tracking-widest">Discover More</span>
            <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/30 p-1.5">
              <motion.div
                animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="h-3 w-1.5 rounded-full bg-white/60"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 z-[5] h-32 bg-gradient-to-t from-background to-transparent" />
      </motion.section>

      {/* Lazy load all sections below the fold */}
      <LazyLandingSections />
    </div>
  );
}
