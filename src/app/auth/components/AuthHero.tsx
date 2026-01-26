"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, Shield, Users, Trophy, TrendingUp } from "lucide-react";

export const AuthHero: React.FC = () => (
  <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
    {/* Background layers */}
    <div className="absolute inset-0">
      {/* Primary gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-fibonacci-blue via-bright-cobalt to-fibonacci-blue" />

      {/* Sports action background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80')",
        }}
      />

      {/* Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-fibonacci-blue/90 via-transparent to-fibonacci-blue/50" />

      {/* Accent gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/20" />
    </div>

    {/* Animated floating elements */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{
          y: [0, -20, 0],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 right-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          y: [0, 20, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-32 left-10 w-80 h-80 bg-white/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 right-1/4 w-40 h-40 bg-aegean-sky/30 rounded-full blur-2xl"
      />
    </div>

    {/* Content */}
    <div className="relative z-10 flex flex-col justify-center p-12 text-white">
      <div className="max-w-lg">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <h1 className="text-5xl font-black tracking-tight mb-3">
            <span className="text-white">SPORTS</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-aegean-sky">
              BLOCK
            </span>
          </h1>
          <p className="text-xl text-white/80 font-light">
            The arena where your passion pays off
          </p>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-white/60 text-sm mb-10"
        >
          Join thousands of sports fans already earning on the Hive blockchain
        </motion.p>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-5"
        >
          <Benefit
            icon={<Zap className="h-5 w-5" />}
            title="Earn Crypto Rewards"
            description="Get paid for quality sports content and engagement"
            delay={0}
          />
          <Benefit
            icon={<Shield className="h-5 w-5" />}
            title="Decentralized & Secure"
            description="Built on Hive blockchain - your content, your earnings"
            delay={0.1}
          />
          <Benefit
            icon={<Users className="h-5 w-5" />}
            title="Join the Community"
            description="Connect with passionate sports fans worldwide"
            delay={0.2}
          />
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 pt-8 border-t border-white/10"
        >
          <div className="flex items-center gap-6 text-white/50 text-xs">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>MEDALS Token</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Real Earnings</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>No Middlemen</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>

    {/* Decorative corner element */}
    <div className="absolute bottom-0 right-0 w-64 h-64 overflow-hidden pointer-events-none">
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-accent/30 to-transparent rounded-full transform translate-x-1/2 translate-y-1/2" />
    </div>
  </div>
);

interface BenefitProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

const Benefit: React.FC<BenefitProps> = ({ icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay: 0.5 + delay }}
    className="flex items-start gap-4 group"
  >
    <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors border border-white/10">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold text-base mb-0.5 text-white">{title}</h3>
      <p className="text-sm text-white/60">{description}</p>
    </div>
  </motion.div>
);

export default AuthHero;
