'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Shield, Zap, Flame, TrendingUp, Clock } from 'lucide-react';

export default function LandingEarnings() {
  return (
    <section className="bg-gradient-to-b from-sb-turf/30 via-sb-turf/50 to-sb-turf/30 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-sb-teal/10 px-4 py-2 font-semibold text-sb-teal">
            <Zap className="h-4 w-4" />
            Powered by Hive Blockchain
          </div>
          <h2 className="mb-6 font-display text-4xl font-bold md:text-5xl">
            Your Opinions Have{' '}
            <span className="bg-gradient-to-r from-sb-gold to-sb-teal bg-clip-text text-transparent">
              Real Value
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-sb-text-muted">
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-sb-teal to-sb-teal-deep text-lg font-bold text-white shadow-lg shadow-sb-teal/25 transition-transform group-hover:scale-110">
                    {item.step}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 flex items-center gap-2 font-display text-xl font-bold">
                    <item.icon className="h-5 w-5 text-sb-teal" />
                    {item.title}
                  </h3>
                  <p className="text-sb-text-muted">{item.description}</p>
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
            className="rounded-3xl border-2 border-sb-teal/20 bg-sb-stadium p-8 shadow-xl shadow-sb-teal/5"
          >
            <div className="mb-8 text-center">
              <h3 className="mb-2 font-display text-2xl font-bold">Earning Potential</h3>
              <p className="text-sm text-sb-text-muted">Based on community engagement</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  level: 'Getting Started',
                  upvotes: '1-5 upvotes',
                  earnings: '$0.01 - $0.50',
                  color: 'bg-sb-teal',
                  width: 'w-1/4',
                },
                {
                  level: 'Building Reputation',
                  upvotes: '5-20 upvotes',
                  earnings: '$0.50 - $3',
                  color: 'bg-sb-teal',
                  width: 'w-1/2',
                },
                {
                  level: 'Established Creator',
                  upvotes: '20-50 upvotes',
                  earnings: '$3 - $10',
                  color: 'bg-sb-gold',
                  width: 'w-3/4',
                },
                {
                  level: 'Top Contributor',
                  upvotes: '50+ upvotes + curation',
                  earnings: '$5 - $10+',
                  color: 'bg-sb-teal-deep',
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
                    <span className="text-lg font-bold text-sb-teal">{tier.earnings}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-sb-turf">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: index * 0.15 }}
                      className={`h-full ${tier.color} ${tier.width} rounded-full`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-sb-text-muted">{tier.upvotes}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 border-t pt-6 text-center">
              <p className="text-sm text-sb-text-muted">
                <Zap className="mr-1 inline h-4 w-4 text-sb-teal" />
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
            <div key={i} className="rounded-xl border bg-sb-stadium p-4 text-center sm:p-5">
              <stat.icon className="mx-auto mb-2 h-5 w-5 text-sb-teal" />
              <div className="text-lg font-bold text-sb-teal sm:text-xl">{stat.value}</div>
              <div className="text-xs text-sb-text-muted">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
