'use client';

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Compass } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/core/Button';
import { Logo } from '@/components/ui/Logo';

export default function LandingHero() {
  const router = useRouter();
  const { scrollY } = useScroll();

  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.9]);
  const parallaxY = useTransform(scrollY, [0, 600], [0, 200]);
  const textY = useTransform(scrollY, [0, 300], [0, 50]);

  return (
    <motion.section
      style={{ opacity: heroOpacity, scale: heroScale }}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Background */}
      <motion.div style={{ y: parallaxY }} className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-sb-void" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(60,96,152,0.15),transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </motion.div>

      {/* Ambient blur blobs */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-sb-teal/15 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -40, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full bg-sb-teal/10 blur-3xl"
        />
      </div>

      {/* Main Hero Content */}
      <motion.div style={{ y: textY }} className="relative z-10 mx-auto max-w-6xl px-6 text-center">
        {/* Brand */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex items-center justify-center gap-3"
        >
          <Logo variant="horizontal" size={56} className="drop-shadow-lg" />
        </motion.div>

        {/* Main Headline */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
          className="relative"
        >
          <h1 className="mb-4 font-display text-4xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
            <span className="text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]">
              PURE SPORTS.
            </span>
            <br />
            <span className="animate-shimmer bg-gradient-to-r from-sb-teal via-sb-teal-flash via-50% to-sb-teal bg-clip-text text-transparent">
              REAL REWARDS.
            </span>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          <p className="mx-auto mb-2 max-w-3xl text-lg font-light leading-relaxed text-white/90 sm:text-xl md:text-2xl">
            No politics. No drama. No noise.
          </p>
          <p className="mx-auto mb-10 max-w-2xl text-base text-white/60 sm:text-lg md:text-xl">
            Just fans who love the game — and get paid for it.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button
            size="lg"
            className="group px-10 py-7 text-lg font-semibold shadow-2xl shadow-sb-teal/25 transition-all duration-300 hover:scale-105 hover:shadow-sb-teal/40"
            onClick={() => router.push('/auth')}
          >
            Sign Up Free
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/30 bg-white/5 px-10 py-7 text-lg text-white backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:bg-white/15"
            onClick={() => router.push('/auth')}
          >
            Sign In
          </Button>
        </motion.div>

        {/* Explore link for SEO — crawlable anchor tag */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mb-6"
        >
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white/80"
          >
            <Compass className="h-4 w-4" />
            Explore Sports Content
          </Link>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="space-y-5"
        >
          <div className="flex flex-wrap items-center justify-center gap-4 text-white/70 sm:gap-8">
            {['Zero fees', 'Free to join', 'You own everything'].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-sb-teal" />
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 sm:gap-8">
            <span className="text-xs text-white/40">Connect with</span>
            {[
              { src: '/icons/hive-keychain-logo.svg', alt: 'Hive Keychain', w: 24, h: 24 },
              { src: '/icons/hivesigner-icon.png', alt: 'HiveSigner', w: 24, h: 24 },
              { src: '/icons/hiveauth-logo.png', alt: 'HiveAuth', w: 24, h: 24 },
              { src: '/icons/ledger-logo.png', alt: 'Ledger', w: 24, h: 24 },
            ].map((wallet, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.6, y: 0 }}
                transition={{ duration: 0.5, delay: 1.3 + i * 0.1 }}
                whileHover={{ opacity: 1, scale: 1.1 }}
                className="transition-opacity"
              >
                <Image
                  src={wallet.src}
                  alt={wallet.alt}
                  width={wallet.w}
                  height={wallet.h}
                  className="h-6 w-6 brightness-0 invert"
                />
              </motion.div>
            ))}
          </div>
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
  );
}
