"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Play,
  TrendingUp,
  Users,
  DollarSign,
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

  // Parallax transforms for hero elements
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.9]);
  const parallaxY = useTransform(scrollY, [0, 600], [0, 200]);
  const textY = useTransform(scrollY, [0, 300], [0, 50]);

  // Redirect authenticated users to feed
  useEffect(() => {
    if (!isLoading && user) {
      router.push("/feed");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <Loading fullPage text="Loading..." />;
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Dynamic Background with Multiple Layers */}
        <motion.div style={{ y: parallaxY }} className="absolute inset-0 z-0">
          {/* Primary background - dramatic sports action */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1461896836934-gy5f7b5sLLKQ?w=1920&q=80')",
            }}
          />
          {/* Fallback gradient if image doesn't load */}
          <div className="absolute inset-0 bg-gradient-to-br from-fibonacci-blue via-bright-cobalt to-fibonacci-blue" />
          {/* Overlay gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
          {/* Accent color overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/10" />
        </motion.div>

        {/* Floating Decorative Elements */}
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
          {/* Animated gradient orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-32 -right-32 w-96 h-96 bg-accent/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl"
          />
        </div>

        {/* Main Hero Content */}
        <motion.div
          style={{ y: textY }}
          className="relative z-10 max-w-6xl mx-auto px-6 text-center"
        >
          {/* Brand Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-white/90 text-sm font-medium">
              Where Sports Fans Earn
            </span>
          </motion.div>

          {/* Main Brand Name */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight mb-4">
              <span className="text-white">SPORTS</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-aegean-sky to-accent">
                BLOCK
              </span>
            </h1>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl sm:text-2xl md:text-3xl text-white/90 font-light mb-4 max-w-3xl mx-auto leading-relaxed"
          >
            The arena where your passion pays off.
          </motion.p>

          {/* Sub-tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-base sm:text-lg text-white/60 mb-10 max-w-2xl mx-auto"
          >
            Share your takes. Build your reputation. Earn crypto rewards.
            <br className="hidden sm:block" />
            Pure sports content on the blockchain.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Button
              size="lg"
              className="text-lg px-10 py-7 bg-accent hover:bg-accent/90 text-white font-semibold group shadow-2xl shadow-accent/25 transition-all duration-300 hover:shadow-accent/40 hover:scale-105"
              onClick={() => openModal("keychainLogin")}
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              Enter the Arena
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-10 py-7 bg-white/5 backdrop-blur-sm border-white/30 text-white hover:bg-white/15 hover:border-white/50 transition-all duration-300"
              onClick={() => openModal("keychainLogin")}
            >
              I Have an Account
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-white/70"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/10 rounded-lg">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-sm">Join thousands on Hive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/10 rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="text-sm">Real crypto earnings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/10 rounded-lg">
                <DollarSign className="h-4 w-4" />
              </div>
              <span className="text-sm">No middlemen</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center text-white/50"
          >
            <span className="text-xs uppercase tracking-widest mb-3">
              Discover More
            </span>
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-1.5">
              <motion.div
                animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-1.5 h-3 bg-white/60 rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-[5]" />
      </motion.section>

      {/* Lazy load all sections below the fold */}
      <LazyLandingSections />
    </div>
  );
}
