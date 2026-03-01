'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Gem,
  Coins,
  Star,
  Gift,
  CheckCircle,
  Flame,
  ArrowRight,
  FileText,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/core/Button';
import { AnimatedCounter, containerVariants, itemVariants } from './LandingSections';

export default function LandingMedals() {
  const router = useRouter();

  return (
    <>
      {/* ━━━ Photo Break ━━━ */}
      <section
        className="relative flex min-h-[50vh] items-center justify-center bg-cover bg-fixed bg-center"
        style={{ backgroundImage: "url('/john-o-nolan-o_gJAkcKJmM-unsplash.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-10 px-6 text-center"
        >
          <h2 className="text-4xl font-black uppercase tracking-wider text-white md:text-6xl">
            Every Sport. One Community.
          </h2>
        </motion.div>
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
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#D4A84B]/10 px-4 py-2 font-semibold text-[#D4A84B]">
              <Trophy className="h-4 w-4" />
              MEDALS Token
            </div>
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">
              Stake & Unlock{' '}
              <span className="bg-gradient-to-r from-[#D4A84B] to-[#C08860] bg-clip-text text-transparent">
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
                stake: 1000,
                Icon: Medal,
                benefits: ['Ad-free experience', 'Bronze badge'],
                color: 'from-[#A0724A] to-[#6B4A30]',
                iconColor: 'text-[#C08860]',
                iconBg: 'bg-[#C08860]/10',
              },
              {
                tier: 'Silver',
                stake: 5000,
                Icon: Award,
                benefits: ['Silver badge', 'Priority curation', 'Early access'],
                color: 'from-[#9AA8B8] to-[#607080]',
                iconColor: 'text-[#A8B8C8]',
                iconBg: 'bg-[#A8B8C8]/10',
              },
              {
                tier: 'Gold',
                stake: 25000,
                Icon: Crown,
                benefits: ['Exclusive contests', 'Analytics dashboard', 'Gold badge'],
                color: 'from-[#D4A84B] to-[#8B7030]',
                iconColor: 'text-[#D4A84B]',
                iconBg: 'bg-[#D4A84B]/10',
              },
              {
                tier: 'Platinum',
                stake: 100000,
                Icon: Gem,
                benefits: ['Boosted visibility', 'VIP support', 'Platinum badge'],
                color: 'from-[#7BA0CC] to-[#3C6098]',
                iconColor: 'text-[#7BA0CC]',
                iconBg: 'bg-[#7BA0CC]/10',
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
                className="rounded-xl border border-[#D4A84B]/20 bg-gradient-to-br from-[#D4A84B]/5 to-[#C08860]/5 p-5 text-center"
              >
                <stat.icon className="mx-auto mb-2 h-6 w-6 text-[#D4A84B]" />
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
    </>
  );
}
