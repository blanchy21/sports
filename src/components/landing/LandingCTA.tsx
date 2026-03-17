'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, ArrowRight, User, FileText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/core/Button';
import { Logo } from '@/components/ui/Logo';
import { useModal } from '@/components/modals/ModalProvider';

export default function LandingCTA() {
  const router = useRouter();
  const { openModal } = useModal();

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

              <Button
                className="group w-full py-6 text-lg"
                onClick={() => openModal('keychainLogin')}
              >
                <Shield className="mr-2 h-5 w-5" />
                Connect Wallet
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

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
                Jump in instantly with your email or Google account.
              </p>

              <ul className="mb-8 space-y-3">
                {['Instant access', 'Read & explore content', 'Upgrade to Hive anytime'].map(
                  (benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-5 w-5 flex-shrink-0 text-sb-teal" />
                      <span>{benefit}</span>
                    </li>
                  )
                )}
              </ul>

              <Button
                variant="outline"
                className="group w-full py-6 text-lg"
                onClick={() => router.push('/auth')}
              >
                <User className="mr-2 h-5 w-5" />
                Quick Start with Email
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <p className="mt-4 text-center text-xs text-sb-text-muted">
                Email &bull; Google &bull; Upgrade to earn later
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
          <Button
            size="lg"
            className="group px-12 py-7 text-lg font-semibold shadow-2xl shadow-sb-teal/30 transition-all duration-300 hover:scale-105 hover:shadow-sb-teal/50"
            onClick={() => signIn('google', { callbackUrl: '/auth/google-callback' })}
          >
            Sign Up Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
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
    </>
  );
}
