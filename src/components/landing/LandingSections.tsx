"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  TrendingUp,
  Filter,
  DollarSign,
  CheckCircle,
  ArrowRight,
  XCircle,
  Heart,
  BarChart3,
  Key,
  User,
  Trophy,
  Coins,
  Crown,
  Star,
  Gift,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const sports = [
  { name: "Football", image: "/football.jpg", color: "from-primary/80 to-primary/60" },
  { name: "Tennis", image: "/tennis.jpg", color: "from-accent/80 to-primary/80" },
  { name: "Rugby", image: "/rugby.jpg", color: "from-red-500/80 to-red-700/80" },
  { name: "Golf", image: "/golf.jpg", color: "from-dancing-mist/80 to-bright-cobalt/80" },
  { name: "American Football", image: "/american-football.jpg", color: "from-accent/80 to-primary/80" },
];

export default function LandingSections() {
  const router = useRouter();

  return (
    <>
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
              Why Sportsblock?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We created Sportsblock because we were tired of scrolling through pain, suffering,
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
                color: "text-accent",
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
                <div className="p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary" />
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
                <div className="p-3 bg-accent/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-accent" />
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
              className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 border-2 border-primary/30"
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Example Earnings</h3>
                <p className="text-sm text-muted-foreground">Based on actual user data</p>
              </div>

              {[
                { engagement: "Low", upvotes: "10-20", earnings: "$0.50 - $2", color: "bg-yellow-500" },
                { engagement: "Medium", upvotes: "50-100", earnings: "$5 - $20", color: "bg-accent" },
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
                  <div className="text-lg font-bold text-primary">{tier.earnings}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* MEDALS Token Section */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-full text-yellow-600 dark:text-yellow-400 font-semibold mb-6">
              <Trophy className="h-4 w-4" />
              MEDALS Token
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Stake, Earn & Unlock Premium
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              MEDALS is our native utility token. Stake your tokens to earn passive rewards
              and unlock exclusive premium features.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <Coins className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Stake for Passive Income</h3>
                  <p className="text-muted-foreground">
                    Stake your MEDALS tokens and earn weekly rewards. The more you stake,
                    the larger your share of the reward pool.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Crown className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Unlock Premium Tiers</h3>
                  <p className="text-muted-foreground">
                    Progress through Bronze, Silver, Gold, and Platinum tiers to unlock
                    exclusive features like ad-free browsing and priority curation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Gift className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Weekly Reward Distributions</h3>
                  <p className="text-muted-foreground">
                    Rewards are distributed every week to stakers, top content creators,
                    and community curators. Multiple ways to earn.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-br from-yellow-500/10 via-purple-500/10 to-primary/10 rounded-2xl p-8 border-2 border-yellow-500/30"
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Premium Tiers</h3>
                <p className="text-sm text-muted-foreground">Stake MEDALS to unlock benefits</p>
              </div>

              {[
                { tier: "Bronze", stake: "1,000", benefits: "Ad-free browsing, Bronze badge", icon: "🥉" },
                { tier: "Silver", stake: "5,000", benefits: "Priority curation, Early access", icon: "🥈" },
                { tier: "Gold", stake: "25,000", benefits: "Exclusive contests, Analytics", icon: "🥇" },
                { tier: "Platinum", stake: "100,000", benefits: "Boosted visibility, VIP support", icon: "💎" }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="bg-card/50 backdrop-blur rounded-lg p-4 mb-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <div className="font-semibold">{item.tier}</div>
                      <div className="text-sm text-muted-foreground">{item.benefits}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">{item.stake}</div>
                    <div className="text-xs text-muted-foreground">MEDALS</div>
                  </div>
                </motion.div>
              ))}

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  <Star className="h-4 w-4 inline mr-1 text-yellow-500" />
                  Higher tiers include all lower-tier benefits
                </p>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: "Staking Rewards", value: "30K+", sublabel: "MEDALS/week", icon: Coins },
              { label: "Content Rewards", value: "15K+", sublabel: "MEDALS/week", icon: Trophy },
              { label: "Curator Rewards", value: "100", sublabel: "per quality vote", icon: Star },
              { label: "Post of the Week", value: "2,000", sublabel: "MEDALS prize", icon: Gift }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card border rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <stat.icon className="h-8 w-8 mx-auto mb-3 text-yellow-500" />
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.sublabel}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Sports Filter Section */}
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
      <section className="py-24 px-6 bg-gradient-to-br from-primary/10 via-accent/10 to-accent/10">
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
              Connect with Hive blockchain using any wallet for full earning potential,
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
                  {["Earn crypto rewards", "Vote on content", "Full community access", "Multiple wallet support"].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-accent" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full group"
                  size="sm"
                  onClick={() => router.push('/auth')}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Connect with Hive
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Supports Keychain, HiveSigner, HiveAuth, Ledger & more
                </p>
              </div>
            </motion.div>

            {/* Hive Wallets Card */}
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
                <h3 className="text-xl font-bold mb-2">Hive Wallets</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Connect with any Hive wallet for seamless authentication.
                </p>

                <div className="space-y-2 mb-4">
                  {["Multiple wallet options", "Earn crypto rewards", "Full platform access"].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-accent" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full group"
                  size="sm"
                  onClick={() => router.push('/auth')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Choose Wallet
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Keychain, HiveSigner, HiveAuth, Ledger, Peak Vault
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
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />

              <div className="relative">
                <User className="h-10 w-10 text-accent mb-3" />
                <h3 className="text-xl font-bold mb-2">Email & Google</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Quick signup with email or Google account for instant access.
                </p>

                <div className="space-y-2 mb-4">
                  {["Instant access", "Read and create posts", "Upgrade to Hive later"].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-accent" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full group"
                  size="sm"
                  onClick={() => router.push('/auth')}
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
            Ready to Join the Community?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start sharing your sports passion and earning rewards in minutes.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6"
            onClick={() => router.push('/auth')}
          >
            Get Started Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </section>
    </>
  );
}
