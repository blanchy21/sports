'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, ArrowRight, User, FileText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/core/Button';
import { Logo } from '@/components/ui/Logo';

export default function LandingCTA() {
  return (
    <>
      {/* ━━━ Authentication CTA ━━━ */}
      <section className="bg-gradient-to-br from-sb-teal/5 via-background to-sb-gold/5 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-6 font-display text-4xl font-bold md:text-5xl">
              <span className="bg-gradient-to-r from-sb-teal to-sb-teal-flash bg-clip-text text-transparent">
                Back Your Call
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-sb-text-muted">
              Your hot take. Your stake. Your payout.
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            {/* Hive Auth Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -8 }}
              className="relative overflow-hidden rounded-3xl border-2 border-sb-teal bg-sb-stadium p-8"
            >
              <div className="absolute right-4 top-4 rounded-full bg-sb-teal px-3 py-1 text-xs font-bold text-[#051A14]">
                RECOMMENDED
              </div>

              <div className="mb-6 w-fit rounded-xl bg-sb-teal/10 p-3">
                <Image
                  src="/icons/hive-keychain-logo.svg"
                  alt="Hive Keychain"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
              </div>

              <h3 className="mb-3 font-display text-2xl font-bold">Full Access with Hive</h3>
              <p className="mb-6 text-sb-text-muted">
                Full platform access with earning capabilities. Use any Hive wallet.
              </p>

              <ul className="mb-8 space-y-3">
                {[
                  'Earn crypto rewards',
                  'Vote & curate content',
                  'Build on-chain reputation',
                  'Multiple wallet support',
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-sb-teal" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link href="/auth">
                <Button className="group w-full py-6 text-lg">
                  <Shield className="mr-2 h-5 w-5" />
                  Connect Wallet
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <p className="mt-4 text-center text-xs text-sb-text-muted">
                Keychain &bull; HiveSigner &bull; HiveAuth &bull; Ledger
              </p>
            </motion.div>

            {/* Email/Google Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -8 }}
              className="rounded-3xl border bg-sb-stadium p-8"
            >
              <div className="mb-6 w-fit rounded-xl bg-sb-gold/10 p-3">
                <User className="h-8 w-8 text-sb-teal" />
              </div>

              <h3 className="mb-3 font-display text-2xl font-bold">Quick Start</h3>
              <p className="mb-6 text-sb-text-muted">
                Jump in instantly with your Google or X account.
              </p>

              <ul className="mb-8 space-y-3">
                {[
                  'Instant sign-up',
                  'Full earning capabilities',
                  'Your own blockchain account',
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-sb-teal" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link href="/auth">
                <Button variant="outline" className="group w-full py-6 text-lg">
                  <User className="mr-2 h-5 w-5" />
                  Quick Start
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <p className="mt-4 text-center text-xs text-sb-text-muted">
                Google &bull; X &bull; Full earning &amp; blockchain features
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ━━━ Final CTA ━━━ */}
      <section className="relative overflow-hidden bg-sb-pitch px-6 py-20 text-white">
        {/* Floating particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            { left: '20%', delay: 0, duration: 8 },
            { left: '50%', delay: 2, duration: 10 },
            { left: '80%', delay: 1, duration: 9 },
          ].map((p, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -300, -600],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: 'linear',
              }}
              className="absolute bottom-0 h-1 w-1 rounded-full bg-white/30"
              style={{ left: p.left }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-10 mx-auto max-w-4xl text-center"
        >
          {/* Sportsblock logo */}
          <div className="mx-auto mb-6 w-fit">
            <Logo variant="mark" size={64} />
          </div>

          <h2 className="mb-4 font-display text-3xl font-bold md:text-5xl">The Arena Awaits</h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/80 sm:text-xl">
            Free to join. Free to post. Free to earn.
          </p>
          <Link href="/auth">
            <Button
              size="lg"
              className="group px-12 py-7 text-lg font-semibold shadow-2xl shadow-sb-teal/30 transition-all duration-300 hover:scale-105 hover:shadow-sb-teal/50"
            >
              Sign Up Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <div className="mt-6">
            <Link
              href="/whitepaper"
              className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white/80"
            >
              <FileText className="h-4 w-4" />
              Read our Whitepaper
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ━━━ Site Footer ━━━ */}
      <footer className="border-t border-white/10 bg-sb-pitch px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/40">
                Explore
              </h3>
              <nav className="flex flex-col gap-2">
                <Link href="/discover" className="text-sm text-white/60 hover:text-white/90">
                  Discover
                </Link>
                <Link href="/feed" className="text-sm text-white/60 hover:text-white/90">
                  Feed
                </Link>
                <Link href="/communities" className="text-sm text-white/60 hover:text-white/90">
                  Communities
                </Link>
                <Link href="/sportsbites" className="text-sm text-white/60 hover:text-white/90">
                  Sportsbites
                </Link>
                <Link href="/leaderboard" className="text-sm text-white/60 hover:text-white/90">
                  Leaderboard
                </Link>
              </nav>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/40">
                Learn
              </h3>
              <nav className="flex flex-col gap-2">
                <Link href="/about" className="text-sm text-white/60 hover:text-white/90">
                  About
                </Link>
                <Link href="/whitepaper" className="text-sm text-white/60 hover:text-white/90">
                  Whitepaper
                </Link>
                <Link href="/medals-token" className="text-sm text-white/60 hover:text-white/90">
                  MEDALS Token
                </Link>
                <Link
                  href="/earn-crypto-sports"
                  className="text-sm text-white/60 hover:text-white/90"
                >
                  Earn Crypto
                </Link>
                <Link
                  href="/start-sports-blog"
                  className="text-sm text-white/60 hover:text-white/90"
                >
                  Start a Sports Blog
                </Link>
                <Link href="/blog" className="text-sm text-white/60 hover:text-white/90">
                  Blog
                </Link>
              </nav>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/40">
                Legal
              </h3>
              <nav className="flex flex-col gap-2">
                <Link href="/legal/terms" className="text-sm text-white/60 hover:text-white/90">
                  Terms of Service
                </Link>
                <Link href="/legal/privacy" className="text-sm text-white/60 hover:text-white/90">
                  Privacy Policy
                </Link>
                <Link href="/legal/cookies" className="text-sm text-white/60 hover:text-white/90">
                  Cookie Policy
                </Link>
                <Link
                  href="/legal/community-guidelines"
                  className="text-sm text-white/60 hover:text-white/90"
                >
                  Community Guidelines
                </Link>
                <Link href="/legal/dmca" className="text-sm text-white/60 hover:text-white/90">
                  DMCA
                </Link>
              </nav>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/40">
                Get Started
              </h3>
              <nav className="flex flex-col gap-2">
                <Link href="/auth" className="text-sm text-white/60 hover:text-white/90">
                  Sign Up
                </Link>
                <Link href="/getting-started" className="text-sm text-white/60 hover:text-white/90">
                  Getting Started
                </Link>
                <Link
                  href="/sportsblock-vs-chiliz"
                  className="text-sm text-white/60 hover:text-white/90"
                >
                  Sportsblock vs Chiliz
                </Link>
              </nav>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/30">
            &copy; {new Date().getFullYear()} Sportsblock. Powered by the Hive blockchain.
          </div>
        </div>
      </footer>
    </>
  );
}
