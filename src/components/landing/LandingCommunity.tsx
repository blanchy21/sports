'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, DollarSign, Zap, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { containerVariants, itemVariants } from './LandingSections';

interface LandingCommunityProps {
  sports: Array<{ name: string; image: string; color: string }>;
}

export default function LandingCommunity({ sports }: LandingCommunityProps) {
  return (
    <>
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
                color: 'text-[#2BAB78]',
                bg: 'bg-[#2BAB78]/10',
              },
              {
                icon: Shield,
                title: 'True Ownership',
                description:
                  'Your posts live on the blockchain forever. No platform can delete or censor your content.',
                color: 'text-primary',
                bg: 'bg-primary/10',
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
    </>
  );
}
