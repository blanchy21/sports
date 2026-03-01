'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  TrendingUp,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Zap,
  Heart,
  Target,
  Flame,
  FileText,
  X,
  Ban,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/core/Button';
import { containerVariants, itemVariants } from './LandingSections';

export default function LandingShowcase() {
  const router = useRouter();

  return (
    <>
      {/* ━━━ Trust Bar ━━━ */}
      <section className="border-b border-border/50 bg-muted/30 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 sm:gap-10"
        >
          {/* Hive logo + text */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Powered by</span>
            <div className="flex items-center gap-2">
              <Image
                src="/hive-logo.svg"
                alt="Hive"
                width={28}
                height={32}
                className="h-7 w-auto"
              />
              <span className="text-lg font-bold text-[#E31337]">HIVE</span>
            </div>
          </div>

          <div className="hidden h-6 w-px bg-border sm:block" />

          {[
            { label: 'MEDALS Supply', value: '500M' },
            { label: 'Transaction Fees', value: 'ZERO' },
            { label: 'Cost to Join', value: 'FREE' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
              className="text-center"
            >
              <div className="text-lg font-bold text-primary">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ━━━ Photo Marquee ━━━ */}
      <section className="relative overflow-hidden py-8 sm:py-12">
        {/* Gradient fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-background to-transparent sm:w-32" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-background to-transparent sm:w-32" />

        {/* Row 1 — scrolls left */}
        <div className="mb-4 flex animate-marquee-left">
          {[
            '/enrique-guzman-egas-Q1zq6ZLnRJA-unsplash.jpg',
            '/david-pisnoy-At5I1OSl_2M-unsplash.jpg',
            '/markus-spiske-WUehAgqO5hE-unsplash.jpg',
            '/robert-ruggiero-LUqej0W6BSI-unsplash.jpg',
            '/moises-alex-WqI-PbYugn4-unsplash.jpg',
            '/welcome-3Q-2blmd5o8-unsplash.jpg',
            '/enrique-guzman-egas-Q1zq6ZLnRJA-unsplash.jpg',
            '/david-pisnoy-At5I1OSl_2M-unsplash.jpg',
            '/markus-spiske-WUehAgqO5hE-unsplash.jpg',
            '/robert-ruggiero-LUqej0W6BSI-unsplash.jpg',
            '/moises-alex-WqI-PbYugn4-unsplash.jpg',
            '/welcome-3Q-2blmd5o8-unsplash.jpg',
          ].map((src, i) => (
            <div
              key={i}
              className="relative mx-2 h-32 w-52 flex-shrink-0 overflow-hidden rounded-xl sm:h-44 sm:w-72"
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes="(min-width: 640px) 288px, 208px"
              />
            </div>
          ))}
        </div>

        {/* Row 2 — scrolls right */}
        <div className="flex animate-marquee-right">
          {[
            '/ben-weber-r-krWscXjvQ-unsplash.jpg',
            '/jeff-cadestin-wRXJuof2eD4-unsplash.jpg',
            '/jack-hunter-Ph0Aa13k5-c-unsplash.jpg',
            '/mat-weller-Hk92KV4zU8M-unsplash.jpg',
            '/muktasim-azlan-pPfOLOK0oeI-unsplash.jpg',
            '/riley-mccullough-iezcEpGuYdE-unsplash.jpg',
            '/chris-chow-IuWcgImMY0k-unsplash.jpg',
            '/ben-weber-r-krWscXjvQ-unsplash.jpg',
            '/jeff-cadestin-wRXJuof2eD4-unsplash.jpg',
            '/jack-hunter-Ph0Aa13k5-c-unsplash.jpg',
            '/mat-weller-Hk92KV4zU8M-unsplash.jpg',
            '/muktasim-azlan-pPfOLOK0oeI-unsplash.jpg',
            '/riley-mccullough-iezcEpGuYdE-unsplash.jpg',
            '/chris-chow-IuWcgImMY0k-unsplash.jpg',
          ].map((src, i) => (
            <div
              key={i}
              className="relative mx-2 h-32 w-52 flex-shrink-0 overflow-hidden rounded-xl sm:h-44 sm:w-72"
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes="(min-width: 640px) 288px, 208px"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ Problem / Solution ━━━ */}
      <section className="relative overflow-hidden px-6 py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 font-semibold text-accent">
              <Target className="h-4 w-4" />
              Why Sportsblock Exists
            </div>
            <h2 className="text-4xl font-bold md:text-5xl">
              Built for{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                True Sports Fans
              </span>
            </h2>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* The Problem */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="rounded-3xl border border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent p-8 sm:p-10"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 text-sm font-semibold text-destructive">
                <Ban className="h-4 w-4" />
                Sound Familiar?
              </div>
              <h3 className="mb-6 text-2xl font-bold sm:text-3xl">Your Sports Feed Is Broken</h3>
              <div className="space-y-5">
                {[
                  'Drowned in political takes and drama that have nothing to do with sports',
                  'Platforms profit from your content while you earn absolutely nothing',
                  'Censored, shadowbanned, or algorithm-buried for having an opinion',
                ].map((text, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </div>
                    <p className="text-muted-foreground">{text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* The Solution */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/5 to-transparent p-8 sm:p-10"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent">
                <Heart className="h-4 w-4" />
                Welcome to Sportsblock
              </div>
              <h3 className="mb-6 text-2xl font-bold sm:text-3xl">
                Built for Fans Who Just Want Sports
              </h3>
              <div className="space-y-5">
                {[
                  'Pure sports content. Community-enforced focus on the game.',
                  'Every post earns real crypto. Your passion has value.',
                  'Blockchain-powered. Your content, your reputation, permanently yours.',
                ].map((text, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/10">
                      <CheckCircle className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <p className="text-foreground">{text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ━━━ Features: Articles & Sportsbites ━━━ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/30 to-background px-6 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-semibold text-primary">
              <Zap className="h-4 w-4" />
              Two Ways to Play
            </div>
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">
              Articles &{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Sportsbites
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Long-form analysis or quick-fire takes. Both earn rewards.
            </p>
          </motion.div>

          {/* Featured content type cards */}
          <div className="mb-16 grid gap-8 md:grid-cols-2">
            {/* Full Article Card */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -8 }}
              className="group overflow-hidden rounded-3xl border bg-card shadow-lg transition-shadow hover:shadow-xl"
            >
              <div className="h-2 bg-gradient-to-r from-primary to-bright-cobalt" />
              <div className="p-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  <FileText className="h-3.5 w-3.5" />
                  Full Articles
                </div>
                {/* Mock article preview */}
                <div className="mb-6 rounded-2xl border bg-muted/30 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent" />
                    <div>
                      <div className="text-sm font-semibold">@sportsfanatic</div>
                      <div className="text-xs text-muted-foreground">5 min read</div>
                    </div>
                  </div>
                  <h4 className="mb-2 font-bold">
                    Why Liverpool&apos;s Midfield Press Is Unstoppable This Season
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Breaking down the tactical genius behind the Reds&apos; relentless high press
                    and why opponents can&apos;t find answers...
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>42 upvotes</span>
                    <span>18 comments</span>
                    <span className="font-semibold text-accent">$7.84 earned</span>
                  </div>
                </div>
                <p className="text-lg font-semibold text-primary">Deep analysis. Real earnings.</p>
                <p className="text-sm text-muted-foreground">
                  Earn $3-$10+ per quality article from community upvotes.
                </p>
              </div>
            </motion.div>

            {/* Sportsbites Card */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              whileHover={{ y: -8 }}
              className="group overflow-hidden rounded-3xl border bg-card shadow-lg transition-shadow hover:shadow-xl"
            >
              <div className="h-2 bg-gradient-to-r from-accent to-aegean-sky" />
              <div className="p-8">
                <div className="mb-4 flex items-center gap-3">
                  <Image
                    src="/sportsbites-logo.png"
                    alt="Sportsbites"
                    width={32}
                    height={32}
                    className="h-8 w-auto"
                  />
                  <span className="text-sm font-semibold text-accent">Sportsbites</span>
                </div>
                {/* Mock sportsbite */}
                <div className="mb-6 rounded-2xl border bg-muted/30 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-aegean-sky" />
                    <div>
                      <div className="text-sm font-semibold">@matchday_maven</div>
                      <div className="text-xs text-muted-foreground">Just now</div>
                    </div>
                  </div>
                  <p className="mb-3 text-sm">
                    WHAT A GOAL! Haaland just scored from 30 yards out. This man is not human. City
                    are running away with it. #PremierLeague
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>28 upvotes</span>
                      <span className="font-semibold text-accent">$1.42 earned</span>
                    </div>
                    <span className="text-xs text-muted-foreground">138/280</span>
                  </div>
                </div>
                <p className="text-lg font-semibold text-accent">Quick takes. Live reactions.</p>
                <p className="text-sm text-muted-foreground">
                  280-character posts for live match moments. Earn daily.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Supporting feature grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="mb-12 grid gap-6 md:grid-cols-3"
          >
            {[
              {
                icon: Zap,
                title: 'Instant Posts',
                description:
                  '280 characters is all you need. React to goals, calls, and clutch moments.',
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                icon: TrendingUp,
                title: 'Trending Feed',
                description:
                  'See what the community is buzzing about. The hottest takes rise to the top.',
                color: 'text-accent',
                bg: 'bg-accent/10',
              },
              {
                icon: DollarSign,
                title: 'Earn Daily',
                description:
                  'Fresh reward pools every day. Quick takes earn HIVE and HBD just like full posts.',
                color: 'text-[#2BAB78]',
                bg: 'bg-[#2BAB78]/10',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className={`inline-flex p-3 ${item.bg} mb-4 rounded-xl`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center"
          >
            <Button
              size="lg"
              className="group px-8 py-6 text-lg"
              onClick={() => router.push('/sportsbites')}
            >
              <Zap className="mr-2 h-5 w-5" />
              Try Sportsbites
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </div>
      </section>
    </>
  );
}
