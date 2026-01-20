"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Shield,
  Zap,
  ArrowRight,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/components/modals/ModalProvider";
import { LazyLandingSections } from "@/components/lazy/LazyLandingContent";

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { openModal } = useModal();
  const { scrollY } = useScroll();

  // Call hooks before any conditional returns
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.95]);
  const parallaxY = useTransform(scrollY, [0, 500], [0, 150]);

  // Redirect authenticated users to feed
  useEffect(() => {
    if (!isLoading && user) {
      router.push("/feed");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <Loading fullPage text="Loading..." />
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Loaded immediately for fast first paint */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background Image with Parallax */}
        <motion.div
          style={{ y: parallaxY }}
          className="absolute inset-0 z-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/stadium.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-background" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Your Escape to Pure
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Sports Content
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto"
          >
            No politics. No propaganda. No suffering. Just pure sports passion and the opportunity to earn from your insights.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              size="lg"
              className="text-lg px-8 py-6 group"
              onClick={() => openModal('keychainLogin')}
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => openModal('keychainLogin')}
            >
              Sign In
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-12 flex items-center justify-center gap-8 text-white/80"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>Hive Blockchain</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              <span>MEDALS Token</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span>Earn Rewards</span>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-white/60 text-center"
          >
            <p className="text-sm mb-2">Scroll to explore</p>
            <div className="w-6 h-10 border-2 border-white/40 rounded-full mx-auto flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-white/60 rounded-full" />
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Lazy load all sections below the fold for faster initial page load */}
      <LazyLandingSections />
    </div>
  );
}
