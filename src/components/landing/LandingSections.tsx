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
  Key,
  User,
  Trophy,
  Coins,
  Star,
  Gift,
  Target,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/core/Button';

// High-quality Unsplash sports images
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
    color: 'from-amber-600/90 to-brown-800/90',
  },
  {
    name: 'Golf',
    image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80',
    color: 'from-sky-500/90 to-blue-700/90',
  },
  {
    name: 'MMA',
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80',
    color: 'from-red-600/90 to-red-900/90',
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

export default function LandingSections() {
  const router = useRouter();

  return (
    <>
      {/* Value Proposition Section */}
      <section className="relative overflow-hidden px-6 py-24">
        {/* Subtle background pattern */}
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
              Why Choose Sportsblock
            </div>
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">
              Built for{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                True Sports Fans
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              A sanctuary where your sports passion is celebrated, rewarded, and never drowned out
              by noise.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid gap-8 md:grid-cols-3"
          >
            {[
              {
                icon: Heart,
                title: 'Pure Passion',
                description:
                  'No politics. No drama. Just sports content from fans who share your love for the game.',
                color: 'text-pink-500',
                bg: 'bg-pink-500/10',
              },
              {
                icon: DollarSign,
                title: 'Earn While You Share',
                description:
                  'Every post has earning potential. Quality content gets rewarded with real crypto.',
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
              },
              {
                icon: Shield,
                title: 'Truly Yours',
                description:
                  'Built on blockchain. Your content, your reputation, your earnings—all permanently yours.',
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border bg-card p-8 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className={`inline-flex p-3 ${item.bg} mb-5 rounded-xl`}>
                  <item.icon className={`h-7 w-7 ${item.color}`} />
                </div>
                <h3 className="mb-3 text-2xl font-bold">{item.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How Earnings Work Section */}
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

            {/* Right: Earnings Example */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="rounded-3xl border-2 border-primary/20 bg-card p-8 shadow-xl shadow-primary/5"
            >
              <div className="mb-8 text-center">
                <h3 className="mb-2 text-2xl font-bold">Earning Potential</h3>
                <p className="text-sm text-muted-foreground">Based on real user earnings</p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    level: 'Getting Started',
                    upvotes: '10-30 upvotes',
                    earnings: '$0.50 - $3',
                    color: 'bg-blue-500',
                    width: 'w-1/4',
                  },
                  {
                    level: 'Building Reputation',
                    upvotes: '50-150 upvotes',
                    earnings: '$5 - $25',
                    color: 'bg-emerald-500',
                    width: 'w-1/2',
                  },
                  {
                    level: 'Established Creator',
                    upvotes: '200-500 upvotes',
                    earnings: '$30 - $100',
                    color: 'bg-orange-500',
                    width: 'w-3/4',
                  },
                  {
                    level: 'Top Contributor',
                    upvotes: '1000+ upvotes',
                    earnings: '$150 - $300+',
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
        </div>
      </section>

      {/* MEDALS Token Section */}
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

          {/* Premium Tiers Grid */}
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
                stake: '1,000',
                icon: '🥉',
                benefits: ['Ad-free experience', 'Bronze badge'],
                color: 'from-amber-600 to-amber-800',
              },
              {
                tier: 'Silver',
                stake: '5,000',
                icon: '🥈',
                benefits: ['Priority curation', 'Early access'],
                color: 'from-slate-400 to-slate-600',
              },
              {
                tier: 'Gold',
                stake: '25,000',
                icon: '🥇',
                benefits: ['Exclusive contests', 'Analytics dashboard'],
                color: 'from-yellow-500 to-amber-600',
              },
              {
                tier: 'Platinum',
                stake: '100,000',
                icon: '💎',
                benefits: ['Boosted visibility', 'VIP support'],
                color: 'from-cyan-400 to-blue-600',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.03 }}
                className="group relative overflow-hidden rounded-2xl border bg-card p-6"
              >
                {/* Gradient top bar */}
                <div
                  className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${item.color}`}
                />

                <div className="mb-4 text-4xl">{item.icon}</div>
                <h3 className="mb-1 text-xl font-bold">{item.tier}</h3>
                <div className="mb-4 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary">{item.stake}</span>
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

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            {[
              { label: 'Weekly Staking Rewards', value: '30K+', icon: Coins },
              { label: 'Content Creator Pool', value: '15K+', icon: Trophy },
              { label: 'Per Quality Vote', value: '100', icon: Star },
              { label: 'Post of the Week', value: '2,000', icon: Gift },
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
                <div className="text-xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Sports Filter Section */}
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
            className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6"
          >
            {sports.map((sport, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl shadow-lg"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url('${sport.image}')` }}
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${sport.color} opacity-70 transition-opacity duration-300 group-hover:opacity-80`}
                />
                <div className="absolute inset-0 flex items-end p-6">
                  <h3 className="text-xl font-bold text-white drop-shadow-lg md:text-2xl">
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
            Plus Cricket, Rugby, Hockey, Boxing, F1, and many more...
          </motion.p>
        </div>
      </section>

      {/* Authentication CTA Section */}
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
              {/* Recommended badge */}
              <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                RECOMMENDED
              </div>

              <div className="mb-6 w-fit rounded-xl bg-primary/10 p-3">
                <Key className="h-8 w-8 text-primary" />
              </div>

              <h3 className="mb-3 text-2xl font-bold">Connect with Hive</h3>
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

              <Button className="group w-full py-6 text-lg" onClick={() => router.push('/auth')}>
                <Shield className="mr-2 h-5 w-5" />
                Connect Wallet
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Keychain • HiveSigner • HiveAuth • Ledger
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
                Sign up with Email
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Email • Google • Upgrade to earn later
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-fibonacci-blue via-bright-cobalt to-fibonacci-blue px-6 py-20 text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl text-center"
        >
          <h2 className="mb-6 text-3xl font-bold md:text-5xl">The Arena Awaits</h2>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-white/80">
            Join thousands of sports fans already earning from their passion.
          </p>
          <Button
            size="lg"
            className="bg-accent px-12 py-7 text-lg font-semibold text-white shadow-2xl shadow-accent/30 transition-all duration-300 hover:scale-105 hover:bg-accent/90 hover:shadow-accent/50"
            onClick={() => router.push('/auth')}
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </section>
    </>
  );
}
