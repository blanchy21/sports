'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView } from 'framer-motion';
import {
  Shield,
  TrendingUp,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Zap,
  Heart,
  User,
  Trophy,
  Coins,
  Star,
  Gift,
  Target,
  Flame,
  FileText,
  X,
  Ban,
  Medal,
  Award,
  Crown,
  Gem,
  Clock,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/core/Button';
import { useModal } from '@/components/modals/ModalProvider';
import CountUp from 'react-countup';

// Unsplash sports images
const sports = [
  {
    name: 'Football',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
    color: 'from-emerald-600/90 to-emerald-900/90',
  },
  {
    name: 'Basketball',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    color: 'from-orange-500/90 to-red-700/90',
  },
  {
    name: 'Tennis',
    image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80',
    color: 'from-lime-500/90 to-green-700/90',
  },
  {
    name: 'American Football',
    image: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80',
    color: 'from-amber-600/90 to-amber-800/90',
  },
  {
    name: 'Cricket',
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80',
    color: 'from-sky-500/90 to-blue-700/90',
  },
  {
    name: 'Boxing',
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80',
    color: 'from-red-600/90 to-red-900/90',
  },
  {
    name: 'Rugby',
    image: 'https://images.unsplash.com/photo-1544298621-77b7dafc5914?w=800&q=80',
    color: 'from-teal-500/90 to-teal-800/90',
  },
  {
    name: 'Golf',
    image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80',
    color: 'from-green-600/90 to-green-900/90',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

function AnimatedCounter({
  end,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 2,
}: {
  end: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const [started, setStarted] = useState(false);
  const ref = React.useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  React.useEffect(() => {
    if (inView) setStarted(true);
  }, [inView]);

  return (
    <span ref={ref}>
      {started ? (
        <CountUp
          start={0}
          end={end}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          duration={duration}
          separator=","
        />
      ) : (
        `${prefix}0${suffix}`
      )}
    </span>
  );
}

export default function LandingSections() {
  const router = useRouter();
  const { openModal } = useModal();

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
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
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

      {/* ━━━ How Earnings Work ━━━ */}
      <section className="bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-semibold text-primary">
              <Zap className="h-4 w-4" />
              Powered by Hive Blockchain
            </div>
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">
              Your Opinions Have{' '}
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                Real Value
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              No premium subscriptions required. No follower thresholds. Start earning from day one.
            </p>
          </motion.div>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: How it works */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              {[
                {
                  icon: Flame,
                  title: 'Share Your Takes',
                  description:
                    'Post your sports opinions, analysis, and predictions. Quality content rises to the top.',
                  step: '01',
                },
                {
                  icon: TrendingUp,
                  title: 'Get Upvoted',
                  description:
                    'Community members vote on content they love. More engagement = more rewards.',
                  step: '02',
                },
                {
                  icon: DollarSign,
                  title: 'Earn Crypto',
                  description:
                    'Rewards are distributed in HIVE and HBD cryptocurrency. Cash out anytime.',
                  step: '03',
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="group flex items-start gap-5"
                >
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-lg font-bold text-white shadow-lg shadow-primary/25 transition-transform group-hover:scale-110">
                      {item.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 flex items-center gap-2 text-xl font-bold">
                      <item.icon className="h-5 w-5 text-accent" />
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Right: Earnings card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="rounded-3xl border-2 border-primary/20 bg-card p-8 shadow-xl shadow-primary/5"
            >
              <div className="mb-8 text-center">
                <h3 className="mb-2 text-2xl font-bold">Earning Potential</h3>
                <p className="text-sm text-muted-foreground">Based on community engagement</p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    level: 'Getting Started',
                    upvotes: '1-5 upvotes',
                    earnings: '$0.01 - $0.50',
                    color: 'bg-blue-500',
                    width: 'w-1/4',
                  },
                  {
                    level: 'Building Reputation',
                    upvotes: '5-20 upvotes',
                    earnings: '$0.50 - $3',
                    color: 'bg-emerald-500',
                    width: 'w-1/2',
                  },
                  {
                    level: 'Established Creator',
                    upvotes: '20-50 upvotes',
                    earnings: '$3 - $10',
                    color: 'bg-orange-500',
                    width: 'w-3/4',
                  },
                  {
                    level: 'Top Contributor',
                    upvotes: '50+ upvotes + curation',
                    earnings: '$5 - $10+',
                    color: 'bg-purple-500',
                    width: 'w-full',
                  },
                ].map((tier, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="group"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold">{tier.level}</span>
                      <span className="text-lg font-bold text-primary">{tier.earnings}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: '100%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: index * 0.15 }}
                        className={`h-full ${tier.color} ${tier.width} rounded-full`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{tier.upvotes}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 border-t pt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  <Zap className="mr-1 inline h-4 w-4 text-accent" />
                  Rewards paid in HIVE & HBD cryptocurrency
                </p>
              </div>
            </motion.div>
          </div>

          {/* Summary stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-12 grid grid-cols-3 gap-4"
          >
            {[
              { icon: DollarSign, label: 'Zero cost to start', value: '$0' },
              { icon: Shield, label: 'Zero platform fees', value: '0%' },
              { icon: Clock, label: 'Rewards distributed daily', value: '24h' },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 text-center sm:p-5">
                <stat.icon className="mx-auto mb-2 h-5 w-5 text-accent" />
                <div className="text-lg font-bold text-primary sm:text-xl">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ━━━ MEDALS Token Section ━━━ */}
      <section className="bg-background px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-yellow-500/10 px-4 py-2 font-semibold text-yellow-600 dark:text-yellow-400">
              <Trophy className="h-4 w-4" />
              MEDALS Token
            </div>
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">
              Stake & Unlock{' '}
              <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                Premium Perks
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              MEDALS is our community token. Stake to earn passive rewards and unlock exclusive
              features.
            </p>
          </motion.div>

          {/* Tier cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                tier: 'Bronze',
                stake: 2500,
                Icon: Medal,
                benefits: ['Bronze badge', 'Community access'],
                color: 'from-amber-600 to-amber-800',
                iconColor: 'text-amber-600',
                iconBg: 'bg-amber-600/10',
              },
              {
                tier: 'Silver',
                stake: 10000,
                Icon: Award,
                benefits: ['Silver badge', 'Priority curation', 'Early access'],
                color: 'from-slate-300 to-slate-500',
                iconColor: 'text-slate-500',
                iconBg: 'bg-slate-500/10',
              },
              {
                tier: 'Gold',
                stake: 25000,
                Icon: Crown,
                benefits: ['Exclusive contests', 'Analytics dashboard', 'Gold badge'],
                color: 'from-yellow-400 to-amber-600',
                iconColor: 'text-yellow-500',
                iconBg: 'bg-yellow-500/10',
              },
              {
                tier: 'Platinum',
                stake: 100000,
                Icon: Gem,
                benefits: ['Ad-free experience', 'Boosted visibility', 'VIP support'],
                color: 'from-cyan-300 to-blue-500',
                iconColor: 'text-cyan-500',
                iconBg: 'bg-cyan-500/10',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.03 }}
                className="group relative overflow-hidden rounded-2xl border bg-card p-6"
              >
                <div
                  className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${item.color}`}
                />
                <div className={`mb-4 inline-flex rounded-xl p-3 ${item.iconBg}`}>
                  <item.Icon className={`h-8 w-8 ${item.iconColor}`} />
                </div>
                <h3 className="mb-1 text-xl font-bold">{item.tier}</h3>
                <div className="mb-4 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary">
                    <AnimatedCounter end={item.stake} />
                  </span>
                  <span className="text-sm text-muted-foreground">MEDALS</span>
                </div>

                <ul className="space-y-2">
                  {item.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 text-accent" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            {[
              { label: 'Weekly Staking Rewards', value: 30000, suffix: '+', icon: Coins },
              { label: 'Content Creator Pool', value: 15000, suffix: '+', icon: Trophy },
              { label: 'Per Quality Vote', value: 100, suffix: '', icon: Star },
              { label: 'Post of the Week', value: 2000, suffix: '', icon: Gift },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 p-5 text-center"
              >
                <stat.icon className="mx-auto mb-2 h-6 w-6 text-yellow-500" />
                <div className="text-xl font-bold text-primary">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Presale Banner */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="animate-border-pulse overflow-hidden rounded-2xl border-2 border-accent/30 bg-gradient-to-r from-accent/10 via-accent/5 to-accent/10 p-8 text-center"
          >
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-sm font-bold text-accent">
              <Flame className="h-4 w-4" />
              TOKEN PRESALE
            </div>
            <h3 className="mb-2 text-2xl font-bold">
              <AnimatedCounter end={10} suffix="M" /> MEDALS at 0.04 HIVE each
            </h3>
            <p className="mb-6 text-muted-foreground">
              Get in early. Stake for rewards and unlock premium features.
            </p>
            <Button
              variant="outline"
              className="group border-accent/50 hover:bg-accent/10"
              onClick={() => router.push('/whitepaper')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Learn More in Whitepaper
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ━━━ Sports Grid ━━━ */}
      <section className="bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">
              Your Sports.{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Your Feed.
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Follow the sports you love. Filter out the rest.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
          >
            {sports.map((sport, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                className="group relative aspect-[3/2] cursor-pointer overflow-hidden rounded-2xl shadow-lg"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url('${sport.image}')` }}
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${sport.color} opacity-70 transition-opacity duration-300 group-hover:opacity-80`}
                />
                <div className="absolute inset-0 flex items-end p-4 sm:p-6">
                  <h3 className="text-lg font-bold text-white drop-shadow-lg sm:text-xl md:text-2xl">
                    {sport.name}
                  </h3>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-10 text-center text-muted-foreground"
          >
            Plus Hockey, F1, MMA, and many more...
          </motion.p>
        </div>
      </section>

      {/* ━━━ Blockchain Trust Section ━━━ */}
      <section className="bg-gradient-to-b from-fibonacci-blue/5 to-background px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-semibold text-primary">
              <Shield className="h-4 w-4" />
              Powered by Hive
            </div>
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">
              Your Content. Your Wallet.{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Your Rules.
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Sportsblock is built on the Hive blockchain — the most censorship-resistant social
              layer in crypto.
            </p>
          </motion.div>

          {/* 3-column benefits */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="mb-16 grid gap-8 md:grid-cols-3"
          >
            {[
              {
                icon: DollarSign,
                title: 'Zero Fees',
                description:
                  'No gas fees. No hidden charges. Every transaction on Hive is completely free.',
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
              },
              {
                icon: Shield,
                title: 'True Ownership',
                description:
                  'Your posts live on the blockchain forever. No platform can delete or censor your content.',
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
              },
              {
                icon: Zap,
                title: 'Instant Payouts',
                description:
                  'Rewards go directly to your Hive wallet. No minimum thresholds, no waiting periods.',
                color: 'text-accent',
                bg: 'bg-accent/10',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border bg-card p-8 text-center transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className={`mx-auto inline-flex p-3 ${item.bg} mb-5 rounded-xl`}>
                  <item.icon className={`h-7 w-7 ${item.color}`} />
                </div>
                <h3 className="mb-3 text-xl font-bold">{item.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Wallet logos */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <p className="mb-6 text-sm font-medium text-muted-foreground">
              Connect with any Hive wallet to start earning
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
              {[
                { src: '/hive-keychain-logo.svg', alt: 'Hive Keychain', label: 'Keychain' },
                { src: '/hivesigner-icon.png', alt: 'HiveSigner', label: 'HiveSigner' },
                { src: '/hiveauth-logo.png', alt: 'HiveAuth', label: 'HiveAuth' },
                { src: '/ledger-logo.png', alt: 'Ledger', label: 'Ledger' },
              ].map((wallet, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-card p-3 transition-shadow hover:shadow-lg">
                    <Image
                      src={wallet.src}
                      alt={wallet.alt}
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{wallet.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ━━━ Authentication CTA ━━━ */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">
              Ready to{' '}
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                Join the Arena?
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Choose how you want to get started
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
              className="relative overflow-hidden rounded-3xl border-2 border-primary bg-card p-8"
            >
              <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                RECOMMENDED
              </div>

              <div className="mb-6 w-fit rounded-xl bg-primary/10 p-3">
                <Image
                  src="/hive-keychain-logo.svg"
                  alt="Hive Keychain"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
              </div>

              <h3 className="mb-3 text-2xl font-bold">Full Access with Hive</h3>
              <p className="mb-6 text-muted-foreground">
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
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-accent" />
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

              <p className="mt-4 text-center text-xs text-muted-foreground">
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
              className="rounded-3xl border bg-card p-8"
            >
              <div className="mb-6 w-fit rounded-xl bg-accent/10 p-3">
                <User className="h-8 w-8 text-accent" />
              </div>

              <h3 className="mb-3 text-2xl font-bold">Quick Start</h3>
              <p className="mb-6 text-muted-foreground">
                Jump in instantly with your email or Google account.
              </p>

              <ul className="mb-8 space-y-3">
                {['Instant access', 'Read & explore content', 'Upgrade to Hive anytime'].map(
                  (benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-5 w-5 flex-shrink-0 text-accent" />
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

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Email &bull; Google &bull; Upgrade to earn later
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ━━━ Final CTA ━━━ */}
      <section className="relative overflow-hidden bg-gradient-to-r from-fibonacci-blue via-bright-cobalt to-fibonacci-blue px-6 py-20 text-white">
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
          <Image
            src="/sportsblock-logo-trans.png"
            alt="Sportsblock"
            width={80}
            height={80}
            className="mx-auto mb-6 h-16 w-16 sm:h-20 sm:w-20"
          />

          <h2 className="mb-4 text-3xl font-bold md:text-5xl">The Arena Awaits</h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/80 sm:text-xl">
            Free to join. Free to post. Free to earn.
          </p>
          <Button
            size="lg"
            className="bg-accent px-12 py-7 text-lg font-semibold text-white shadow-2xl shadow-accent/30 transition-all duration-300 hover:scale-105 hover:bg-accent/90 hover:shadow-accent/50"
            onClick={() => openModal('keychainLogin')}
          >
            Join Sportsblock
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
