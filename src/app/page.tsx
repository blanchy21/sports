"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  Shield, 
  TrendingUp, 
  Filter, 
  DollarSign, 
  Users, 
  Zap,
  CheckCircle,
  ArrowRight,
  XCircle,
  Heart,
  MessageCircle,
  BarChart3,
  Key,
  User
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";

const sports = [
  { name: "Football", image: "/football.jpg", color: "from-green-500/80 to-green-700/80" },
  { name: "Tennis", image: "/tennis.jpg", color: "from-yellow-500/80 to-orange-600/80" },
  { name: "Rugby", image: "/rugby.jpg", color: "from-red-500/80 to-red-700/80" },
  { name: "Golf", image: "/golf.jpg", color: "from-emerald-500/80 to-teal-600/80" },
  { name: "American Football", image: "/american-football.jpg", color: "from-blue-500/80 to-indigo-700/80" },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
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
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
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
              onClick={() => setIsAuthModalOpen(true)}
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => setIsAuthModalOpen(true)}
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
              <Users className="h-5 w-5" />
              <span>10K+ Users</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span>50K+ Posts</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <span>$100K+ Earned</span>
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

      {/* Mission Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/football.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background/80" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Sports Arena?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We created Sports Arena because we were tired of scrolling through pain, suffering, 
              political propaganda, and religious debates just to read about sports.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: XCircle,
                title: "No Distractions",
                description: "No politics, no religion, no negativity. Just pure sports content that lets you escape reality.",
                color: "text-red-500",
                delay: 0.2
              },
              {
                icon: Heart,
                title: "Pure Passion",
                description: "Sports is about excitement, competition, and community. We keep the focus where it belongs.",
                color: "text-pink-500",
                delay: 0.4
              },
              {
                icon: Shield,
                title: "Your Safe Space",
                description: "A dedicated platform where sports fans can share, discuss, and celebrate without interference.",
                color: "text-blue-500",
                delay: 0.6
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: item.delay }}
                whileHover={{ y: -10 }}
                className="bg-card border rounded-xl p-8 hover:shadow-xl transition-all duration-300"
              >
                <item.icon className={`h-12 w-12 ${item.color} mb-4`} />
                <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Blockchain Monetization Section */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold mb-6">
              <Zap className="h-4 w-4" />
              Powered by Hive Blockchain
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Get Paid for Your Opinions
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Unlike traditional platforms, you don&apos;t need premium subscriptions or thousands 
              of followers to start earning. Every post has earning potential.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Earn $0.50 to $200+ Per Post</h3>
                  <p className="text-muted-foreground">
                    Your earnings are based purely on engagement. The more upvotes and interaction 
                    your content receives, the more you earn.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">No Premium Required</h3>
                  <p className="text-muted-foreground">
                    Unlike X (Twitter) and other platforms, you don&apos;t need to pay for premium 
                    memberships or meet follower thresholds to monetize your content.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Transparent & Fair</h3>
                  <p className="text-muted-foreground">
                    Built on Hive blockchain technology, all rewards are transparent, immutable, 
                    and paid directly to you without middlemen.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-2xl p-8 border-2 border-primary/30"
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Example Earnings</h3>
                <p className="text-sm text-muted-foreground">Based on actual user data</p>
              </div>
              
              {[
                { engagement: "Low", upvotes: "10-20", earnings: "$0.50 - $2", color: "bg-yellow-500" },
                { engagement: "Medium", upvotes: "50-100", earnings: "$5 - $20", color: "bg-orange-500" },
                { engagement: "High", upvotes: "200-500", earnings: "$30 - $80", color: "bg-red-500" },
                { engagement: "Viral", upvotes: "1000+", earnings: "$100 - $200+", color: "bg-purple-500" }
              ].map((tier, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="bg-card/50 backdrop-blur rounded-lg p-4 mb-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                    <div>
                      <div className="font-semibold">{tier.engagement} Engagement</div>
                      <div className="text-sm text-muted-foreground">{tier.upvotes} upvotes</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-green-500">{tier.earnings}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sports Filter Section */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold mb-6">
              <Filter className="h-4 w-4" />
              Personalized Experience
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Filter by Your Favorite Sports
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Only interested in tennis? Love basketball? You choose what you see. 
              No more scrolling through sports you don&apos;t care about.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {sports.map((sport, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative h-48 rounded-xl overflow-hidden cursor-pointer group"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url('${sport.image}')` }}
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${sport.color} group-hover:opacity-90 transition-opacity`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <h3 className="text-white text-xl font-bold text-center px-2">{sport.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-center mt-12"
          >
            <p className="text-lg text-muted-foreground mb-6">
              And many more sports including Cricket, Baseball, Hockey, MMA, and more!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Authentication CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary/10 via-blue-500/10 to-purple-500/10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Join the Arena?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choose your way to get started. Connect with Hive blockchain for full earning potential, 
              or use email/Google for instant access.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Hive Auth Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -10 }}
              className="bg-card border-2 border-primary rounded-2xl p-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
              
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-full text-primary text-sm font-semibold mb-4">
                  Recommended
                </div>
                
                <Shield className="h-10 w-10 text-primary mb-3" />
                <h3 className="text-xl font-bold mb-2">Hive Blockchain</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Earn crypto rewards and participate in the decentralized sports community.
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Earn crypto rewards</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Vote on content</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Full community access</span>
                  </div>
                </div>

                <Button 
                  className="w-full group"
                  size="sm"
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Connect with Hive
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Requires Hive Keychain or Hive Signer
                </p>
              </div>
            </motion.div>

            {/* Hivesigner Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -10 }}
              className="bg-card border rounded-2xl p-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
              
              <div className="relative">
                <Shield className="h-10 w-10 text-red-500 mb-3" />
                <h3 className="text-xl font-bold mb-2">Hivesigner</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Easy web-based authentication for Hive blockchain access.
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>No extension required</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Earn crypto rewards</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Full platform access</span>
                  </div>
                </div>

                <Button 
                  variant="outline"
                  className="w-full group"
                  size="sm"
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Connect with Hivesigner
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Web-based Hive authentication
                </p>
              </div>
            </motion.div>

            {/* Google/Email Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -10 }}
              className="bg-card border rounded-2xl p-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
              
              <div className="relative">
                <User className="h-10 w-10 text-blue-500 mb-3" />
                <h3 className="text-xl font-bold mb-2">Email & Google</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Quick signup with email or Google account for instant access.
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Instant access</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Read and create posts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Upgrade to Hive later</span>
                  </div>
                </div>

                <Button 
                  variant="outline"
                  className="w-full group"
                  size="sm"
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign up with Email
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Upgrade to Hive anytime for earnings
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6 bg-background border-t">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Join Thousands of Sports Fans Today
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start sharing your sports passion and earning rewards in minutes.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={() => setIsAuthModalOpen(true)}
          >
            Get Started Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </section>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
