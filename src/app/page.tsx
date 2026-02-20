'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, FileText } from 'lucide-react';
import Image from 'next/image';
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

  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.9]);
  const parallaxY = useTransform(scrollY, [0, 600], [0, 200]);
  const textY = useTransform(scrollY, [0, 300], [0, 50]);

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/sportsbites');
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
        {/* Dynamic Background */}
        <motion.div style={{ y: parallaxY }} className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/vienna-reyes-Zs_o1IjVPt4-unsplash.jpg')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-fibonacci-blue via-bright-cobalt to-fibonacci-blue" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-accent/10" />
        </motion.div>

        {/* Floating Decorative Elements */}
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
              x: [0, -40, 0],
              y: [0, 30, 0],
            }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl"
          />

          {/* Floating particles */}
          {[
            { left: '15%', delay: 0, duration: 7, size: 'h-1 w-1' },
            { left: '35%', delay: 1.5, duration: 9, size: 'h-1.5 w-1.5' },
            { left: '55%', delay: 0.5, duration: 8, size: 'h-1 w-1' },
            { left: '75%', delay: 2, duration: 10, size: 'h-2 w-2' },
            { left: '90%', delay: 1, duration: 7.5, size: 'h-1 w-1' },
          ].map((p, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -400, -800],
                opacity: [0, 0.8, 0],
                x: [0, Math.sin(i) * 30, Math.cos(i) * 20],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: 'linear',
              }}
              className={`absolute bottom-0 ${p.size} rounded-full bg-white/40`}
              style={{ left: p.left }}
            />
          ))}

          {/* Diagonal light streaks */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear', delay: 2 }}
            className="absolute left-0 top-1/4 h-px w-1/3 rotate-[30deg] bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
          <motion.div
            animate={{ x: ['200%', '-100%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear', delay: 5 }}
            className="absolute right-0 top-2/3 h-px w-1/4 -rotate-[25deg] bg-gradient-to-r from-transparent via-accent/20 to-transparent"
          />
        </div>

        {/* Main Hero Content */}
        <motion.div
          style={{ y: textY }}
          className="relative z-10 mx-auto max-w-6xl px-6 text-center"
        >
          {/* Sportsblock Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-3 inline-block"
          >
            <motion.div
              animate={{ opacity: [0.2, 0.4, 0.2], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 -z-10 rounded-full bg-accent/20 blur-[60px]"
            />
            <Image
              src="/sportsblock-logo-trans.png"
              alt="Sportsblock"
              width={160}
              height={160}
              className="mx-auto h-28 w-28 drop-shadow-2xl sm:h-36 sm:w-36 md:h-40 md:w-40"
              priority
            />
          </motion.div>

          {/* Brand Name */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-2 text-3xl font-bold tracking-wide text-white sm:text-4xl md:text-5xl"
          >
            Sportsblock
          </motion.h2>

          {/* Live Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E31337] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E31337]"></span>
            </span>
            <span className="text-sm font-medium text-white/90">LIVE on Hive Blockchain</span>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
            className="relative"
          >
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 -z-10 mx-auto h-full w-3/4 rounded-full bg-accent/15 blur-[80px]"
            />
            <h1 className="mb-4 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
              <span className="text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]">
                PURE SPORTS.
              </span>
              <br />
              <span className="animate-shimmer bg-gradient-to-r from-accent via-aegean-sky via-50% to-accent bg-clip-text text-transparent">
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
              className="group bg-accent px-10 py-7 text-lg font-semibold text-white shadow-2xl shadow-accent/25 transition-all duration-300 hover:scale-105 hover:bg-accent/90 hover:shadow-accent/40"
              onClick={() => openModal('keychainLogin')}
            >
              Join the Arena
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/5 px-10 py-7 text-lg text-white backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:bg-white/15"
              onClick={() => router.push('/whitepaper')}
            >
              <FileText className="mr-2 h-5 w-5" />
              Read Whitepaper
            </Button>
          </motion.div>

          {/* Trust indicators - Wallet logos + key points */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="space-y-5"
          >
            {/* Key selling points */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-white/70 sm:gap-8">
              {['Zero fees', 'Free to join', 'You own everything'].map((text, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>

            {/* Wallet logos */}
            <div className="flex items-center justify-center gap-6 sm:gap-8">
              <span className="text-xs text-white/40">Connect with</span>
              {[
                { src: '/hive-keychain-logo.svg', alt: 'Hive Keychain', w: 24, h: 24 },
                { src: '/hivesigner-icon.png', alt: 'HiveSigner', w: 24, h: 24 },
                { src: '/hiveauth-logo.png', alt: 'HiveAuth', w: 24, h: 24 },
                { src: '/ledger-logo.png', alt: 'Ledger', w: 24, h: 24 },
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

      {/* Lazy load all sections below the fold */}
      <LazyLandingSections />
    </div>
  );
}
