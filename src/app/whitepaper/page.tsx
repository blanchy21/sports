'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Button } from '@/components/core/Button';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-6 mt-16 border-b border-border pb-3 text-3xl font-bold first:mt-0">
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-4 mt-10 text-xl font-bold">{children}</h3>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>;
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mb-6 space-y-2 pl-6">
      {items.map((item, i) => (
        <li key={i} className="list-disc leading-relaxed text-muted-foreground">
          {item}
        </li>
      ))}
    </ul>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mb-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="border border-border bg-primary px-4 py-3 text-left font-semibold text-primary-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="even:bg-muted/30">
              {row.map((cell, j) => (
                <td key={j} className="border border-border px-4 py-3 text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <a href="/Sportsblock_Whitepaper.docx" download>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download .docx
            </Button>
          </a>
        </div>
      </header>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-b from-primary/5 to-background px-6 py-20 text-center"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            <FileText className="h-4 w-4" />
            Version 4.0 &middot; February 2026
          </div>
          <h1 className="mb-4 text-5xl font-black tracking-tight sm:text-6xl">
            <span className="text-foreground">SPORTSBLOCK</span>{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              WHITEPAPER
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            A Layer-2 Decentralized Sports Community on the Hive Blockchain
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
              <strong>Token:</strong> MEDALS
            </span>
            <span>
              <strong>Website:</strong> sportsblock.app
            </span>
            <span>
              <strong>X:</strong> @sportsblockinfo
            </span>
            <span>
              <strong>Discord:</strong> discord.gg/rn5wpX7g8X
            </span>
          </div>
        </div>
      </motion.section>

      {/* Table of Contents */}
      <nav className="border-b border-border bg-muted/30 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-lg font-bold">Table of Contents</h2>
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Executive Summary',
              'Key Features',
              'Problem Statement',
              'Solution',
              'Sportsbites',
              'Earning Potential',
              'MEDALS Staking Tiers',
              'Tokenomics',
              'Deflationary Mechanism',
              'Roadmap',
              'Team',
              'Competitive Landscape',
              'Risks & Disclaimers',
            ].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span className="text-primary">&bull;</span>
                {item}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mx-auto max-w-4xl px-6 py-12"
      >
        {/* Executive Summary */}
        <section id="executive-summary">
          <SectionHeading>Executive Summary</SectionHeading>
          <Paragraph>
            Sportsblock is a decentralized platform built as a layer-2 solution on the Hive
            blockchain, designed to foster a vibrant global sports community. By leveraging
            Hive&apos;s fast, fee-less transactions and social reward mechanisms, SportsBlock
            enables users to create, curate, and engage with sports-related content while earning
            rewards through staking, curation, and participation.
          </Paragraph>
          <Paragraph>
            The native token, MEDALS, powers the ecosystem with a maximum supply of 500 million.
            Token emissions are structured over 50 years to incentivize early adoption, community
            growth, and long-term sustainability. Revenue from ads, HBD interest, premium accounts,
            and other sources will fund buybacks, with 50% permanently staked to an inaccessible
            account for deflationary pressure.
          </Paragraph>
        </section>

        {/* Key Features */}
        <section id="key-features">
          <SectionHeading>Key Features</SectionHeading>
          <BulletList
            items={[
              <span key="sb">
                <strong>Sportsbites:</strong> 280-character quick takes for live match reactions,
                hot takes, and instant sports commentary. All stored on Hive, all earning rewards.
              </span>,
              <span key="cr">
                <strong>Content Rewards:</strong> Weekly payouts for top posts based on engagement
                metrics.
              </span>,
              <span key="cs">
                <strong>Curation System:</strong> Curators vote to distribute rewards via a custom
                bot.
              </span>,
              <span key="st">
                <strong>Staking:</strong> Earn yields on staked MEDALS, distributed weekly, with
                tiered benefits.
              </span>,
              <span key="ts">
                <strong>Token Sale:</strong> 10 million MEDALS at 0.04 HIVE per MEDAL to raise up to
                460,000 HIVE (~$35,000 USD).
              </span>,
            ]}
          />
          <SubHeading>Current Status</SubHeading>
          <BulletList
            items={[
              <span key="mt">
                <strong>MEDALS Token:</strong> LIVE on Hive-Engine
              </span>,
              <span key="sk">
                <strong>Staking:</strong> LIVE with weekly rewards
              </span>,
              <span key="lp">
                <strong>Liquidity Pools:</strong> LIVE on Tribaldex
              </span>,
              <span key="ws">
                <strong>Website:</strong> LIVE at sportsblock.app
              </span>,
              <span key="fl">
                <strong>Full Platform Launch:</strong> April 2026
              </span>,
            ]}
          />
        </section>

        {/* Problem Statement */}
        <section id="problem-statement">
          <SectionHeading>Problem Statement</SectionHeading>
          <Paragraph>
            Traditional sports communities (e.g., forums, social media groups) suffer from
            centralization issues:
          </Paragraph>
          <BulletList
            items={[
              <span key="co">
                <strong>Content Ownership:</strong> Platforms like Reddit or X control user data and
                monetization.
              </span>,
              <span key="ri">
                <strong>Reward Inequality:</strong> Creators and curators rarely earn fairly from
                engagement.
              </span>,
              <span key="es">
                <strong>Engagement Silos:</strong> Fragmented discussions across apps limit
                virality.
              </span>,
              <span key="mb">
                <strong>Monetization Barriers:</strong> Ads and premiums benefit platforms, not
                users.
              </span>,
            ]}
          />
          <Paragraph>
            Blockchain solutions exist (e.g., Hive&apos;s social layer), but sports-specific
            ecosystems are underdeveloped, lacking tailored incentives for contests, predictions,
            and niche sports.
          </Paragraph>
        </section>

        {/* Solution */}
        <section id="solution">
          <SectionHeading>Solution: SportsBlock on Hive</SectionHeading>
          <Paragraph>
            SportsBlock is a dedicated dApp and community hub on Hive, using layer-2 tokens via
            Hive-Engine for seamless integration. Users post sports content (news, analyses, memes,
            predictions) via Hive frontends like PeakD or our custom site, earning MEDALS through:
          </Paragraph>
          <BulletList
            items={[
              <span key="ar">
                <strong>Automated Rewards:</strong> For views, comments, and engagement.
              </span>,
              <span key="cv">
                <strong>Curated Votes:</strong> Human curators amplify quality content.
              </span>,
              <span key="sy">
                <strong>Staking Yields:</strong> Passive income for holders with tiered benefits.
              </span>,
            ]}
          />
        </section>

        {/* Sportsbites */}
        <section id="sportsbites">
          <SectionHeading>Sportsbites: Quick Takes, Real Rewards</SectionHeading>
          <Paragraph>
            Sportsbites are 280-character posts designed for live match reactions, hot takes, and
            instant sports commentary. This short-form content format allows users to engage quickly
            during live events while still earning crypto rewards.
          </Paragraph>
          <SubHeading>Sportsbites Features</SubHeading>
          <BulletList
            items={[
              <span key="ip">
                <strong>Instant Posts:</strong> 280 characters is all you need. React to goals,
                calls, and clutch moments in real time.
              </span>,
              <span key="tf">
                <strong>Trending Feed:</strong> See what the community is buzzing about. The hottest
                takes rise to the top.
              </span>,
              <span key="ed">
                <strong>Earn Daily:</strong> Fresh reward pools every day. Your quick takes earn
                HIVE and HBD just like full posts.
              </span>,
            ]}
          />
          <Paragraph>
            All Sportsbites are stored on the Hive blockchain, ensuring permanent ownership and
            transparent reward distribution.
          </Paragraph>
        </section>

        {/* Earning Potential */}
        <section id="earning-potential">
          <SectionHeading>Earning Potential</SectionHeading>
          <Paragraph>
            Your opinions have real value on SportsBlock. No premium subscriptions required. No
            follower thresholds. Start earning from day one.
          </Paragraph>
          <Paragraph>
            <em>
              Rewards are paid in HIVE &amp; HBD cryptocurrency. Figures based on real user earnings
              across the Hive ecosystem.
            </em>
          </Paragraph>
        </section>

        {/* MEDALS Staking Tiers */}
        <section id="medals-staking-tiers">
          <SectionHeading>MEDALS Staking Tiers</SectionHeading>
          <Paragraph>
            MEDALS is our community token. Stake to earn passive rewards and unlock exclusive
            features based on your tier level.
          </Paragraph>
          <DataTable
            headers={['Tier', 'MEDALS Required', 'Benefits']}
            rows={[
              ['Bronze', '1,000', 'Ad-free experience, Bronze badge'],
              ['Silver', '5,000', 'Priority curation, Early access to features'],
              ['Gold', '25,000', 'Exclusive contests, Analytics dashboard'],
              ['Platinum', '100,000', 'Boosted visibility, VIP support'],
            ]}
          />
        </section>

        {/* Tokenomics */}
        <section id="tokenomics">
          <SectionHeading>Tokenomics</SectionHeading>
          <SubHeading>Token Details</SubHeading>
          <BulletList
            items={[
              <span key="sy">
                <strong>Symbol:</strong> MEDALS
              </span>,
              <span key="ms">
                <strong>Max Supply:</strong> 500,000,000 (hard cap enforced via smart contract)
              </span>,
              <span key="ut">
                <strong>Utility:</strong> Staking for yields; rewards for content/curators; payments
                for premiums/ads.
              </span>,
              <span key="ct">
                <strong>Contract:</strong> Deployed on Hive-Engine (precision: 3 decimals;
                stakeable: true).
              </span>,
            ]}
          />
          <SubHeading>Presale Proceeds Allocation</SubHeading>
          <BulletList
            items={[
              <span key="b1">
                <strong>Batch 1:</strong> Seed Tribaldex liquidity pool.
              </span>,
              <span key="b2">
                <strong>Batch 2:</strong> Powered up to @sportsblock for curation.
              </span>,
              <span key="b3">
                <strong>Batch 3:</strong> Exchanged to HBD and staked for ~15-20% APY interest.
              </span>,
            ]}
          />
          <SubHeading>Emission Schedule</SubHeading>
          <Paragraph>
            Emissions are phased to bootstrap growth, with early years focusing on sales and
            incentives. Undistributed tokens remain unminted until needed, ensuring supply stays
            under cap.
          </Paragraph>
          <SubHeading>Weekly Content Reward Categories</SubHeading>
          <DataTable
            headers={['Category', 'Weekly MEDALS']}
            rows={[
              ['Most External Views', '5,000 - 6,000'],
              ['Most Viewed Post', '3,000'],
              ['Most Comments Made', '3,000'],
              ['Most Engaged Post', '2,000'],
              ['Post of the Week', '2,000'],
              ['Best Newcomer (Year 4+)', '1,000'],
            ]}
          />
          <SubHeading>Curator Selection Process</SubHeading>
          <Paragraph>
            Curators are handpicked by the founders from trusted, long-term Hive community members
            who have demonstrated commitment to the platform and built strong reputations in sports
            content. Selection criteria include:
          </Paragraph>
          <BulletList
            items={[
              'Multi-year presence on the Hive blockchain',
              'Established reputation in sports communities (e.g., HiveFPL, Sportstalk)',
              'Track record of quality curation and community engagement',
              'Personal trust relationship with founders',
            ]}
          />
          <Paragraph>
            This approach ensures curators are accountable community members with aligned
            incentives, not anonymous actors. Curator performance is monitored, and the team
            reserves the right to replace underperforming or inactive curators.
          </Paragraph>

          <SubHeading>Community Participation on Hive</SubHeading>
          <Paragraph>
            SportsBlock is built on the principle that a thriving community is a two-way
            relationship. We invest heavily in content rewards, curation, and platform development
            to support our members, and in return we ask that community members contribute to the
            sustainability of the ecosystem.
          </Paragraph>
          <Paragraph>
            All posts published to the SportsBlock community on Hive are required to set
            @sportsblock as a 5% beneficiary. This small contribution is directed back into the
            platform&apos;s operations, curation power, and token buybacks, ensuring the community
            continues to grow and reward its members over the long term.
          </Paragraph>
          <Paragraph>
            Only posts that include the 5% beneficiary will be eligible for curation from the
            SportsBlock team. This policy ensures that everyone who benefits from the community also
            contributes to its success. The more you put in, the more you get back.
          </Paragraph>

          <SubHeading>Founder Token Vesting Schedule</SubHeading>
          <Paragraph>
            To demonstrate long-term commitment and align founder incentives with project success,
            all founder tokens follow a strict vesting schedule:
          </Paragraph>
          <BulletList
            items={[
              <span key="y12">
                <strong>Years 1-2 (Lock Period):</strong> 100% of founder tokens remain locked and
                staked. No unstaking permitted.
              </span>,
              <span key="y3">
                <strong>Year 3 (Vest Begins):</strong> 25% unlocks at month 24, another 25% at month
                30.
              </span>,
              <span key="y4">
                <strong>Year 4 (Vest Completes):</strong> 25% unlocks at month 36, final 25% at
                month 42. Full vesting complete at 3.5 years.
              </span>,
            ]}
          />
          <Paragraph>
            During the lock period, founders may claim staking rewards but cannot unstake principal
            tokens. This 2-year lock + 2-year vest structure ensures founders remain committed
            through the critical growth phase.
          </Paragraph>
        </section>

        {/* Deflationary Mechanism */}
        <section id="deflationary-mechanism">
          <SectionHeading>Deflationary Mechanism</SectionHeading>
          <SubHeading>Revenue Sources</SubHeading>
          <BulletList
            items={[
              'Ads (e.g., Google AdSense, sponsors)',
              'HBD interest (15-20% APY on staked Batch 3)',
              'Premium accounts (ad-free, exclusive features)',
              'Expansions (NFTs, delegations)',
            ]}
          />
          <SubHeading>Buyback Allocation</SubHeading>
          <BulletList
            items={[
              '50% of revenue buys MEDALS from Tribaldex and stakes them to @medals-burn',
              'Locked balance earns staking rewards, compounding removal from circulation',
              '5% contribution from post earnings automatically taken as beneficiary rewards',
              'Split: 50% buyback/stake, 30% operations, 20% HBD reserves',
            ]}
          />
          <Paragraph>
            Governance Post-Year 1: Introduce DAO proposals on Hive for adjustments (e.g., emission
            reductions, new categories). Staked MEDALS grant voting power.
          </Paragraph>
        </section>

        {/* Roadmap */}
        <section id="roadmap">
          <SectionHeading>Roadmap</SectionHeading>
          <DataTable
            headers={['Phase', 'Timeline', 'Milestones']}
            rows={[
              [
                'Beta',
                'COMPLETE',
                'Site live; MEDALS token launched; staking & liquidity pools active',
              ],
              [
                'Full Launch',
                'April 2026',
                'Activate full rewards, curation bot; Sportsbites; marketing push',
              ],
              [
                'Growth',
                'Years 1-3',
                'Scale curators to 10+; add premiums/ads; target 1k+ active users',
              ],
              ['Maturity', 'Years 4+', 'Games, NFTs, integrations; revenue-driven buybacks'],
            ]}
          />
        </section>

        {/* Team */}
        <section id="team">
          <SectionHeading>Team</SectionHeading>
          <Paragraph>
            SportsBlock is founded by long-term Hive blockchain community members with extensive
            experience in the ecosystem:
          </Paragraph>
          <BulletList
            items={[
              <span key="b">
                <strong>@blanchy</strong> &ndash; Co-Founder
              </span>,
              <span key="n">
                <strong>@niallon11</strong> &ndash; Co-Founder
              </span>,
            ]}
          />
          <Paragraph>
            Both founders are established Hive users with proven track records in the community.
            Their profiles and contribution history can be verified on-chain via PeakD, Hive.blog,
            or any Hive block explorer.
          </Paragraph>
        </section>

        {/* Competitive Landscape */}
        <section id="competitive-landscape">
          <SectionHeading>Competitive Landscape</SectionHeading>
          <Paragraph>
            The sports blockchain space includes established players like Chiliz/Socios, which
            focuses on fan tokens for major sports clubs. SportsBlock takes a fundamentally
            different approach:
          </Paragraph>
          <DataTable
            headers={['Feature', 'Chiliz/Socios', 'SportsBlock']}
            rows={[
              ['Model', 'Club fan tokens', 'Content creator rewards'],
              [
                'How to Earn',
                'Buy tokens, hold, vote in polls',
                'Create content, get upvoted, stake',
              ],
              ['Transaction Fees', 'Gas fees on Chiliz Chain', 'Zero fees on Hive'],
              ['Barrier to Entry', 'Purchase required', 'Free to join and earn'],
              ['Governance', 'Corporate partnerships', 'Community-driven curation'],
              ['Content', 'Club-controlled', 'User-generated, fan-owned'],
            ]}
          />
          <Paragraph>
            SportsBlock targets grassroots sports fans who want to actively participate and earn
            through engagement, not just hold tokens. Our zero-fee Hive infrastructure and
            content-first approach creates opportunities for fans worldwide, regardless of their
            financial starting point.
          </Paragraph>
        </section>

        {/* Risks */}
        <section id="risks---disclaimers">
          <SectionHeading>Risks and Disclaimers</SectionHeading>
          <BulletList
            items={[
              <span key="mv">
                <strong>Market Volatility:</strong> Hive/MEDALS prices fluctuate; no guarantees on
                value.
              </span>,
              <span key="ar">
                <strong>Adoption Risk:</strong> Success depends on community growth; low engagement
                could limit rewards.
              </span>,
              <span key="tr">
                <strong>Technical Risks:</strong> Bot exploits or Hive forks (mitigated via
                audits/open-source).
              </span>,
              <span key="rg">
                <strong>Regulatory:</strong> Token sales may face scrutiny; consult local laws.
              </span>,
              <span key="ni">
                <strong>No Investment Advice:</strong> This is not financial advice; participate at
                your own risk.
              </span>,
            ]}
          />
          <Paragraph>
            SportsBlock is community-driven. Join via Hive, Discord, or X (@sportsblockinfo) to
            contribute.
          </Paragraph>
        </section>

        {/* Footer */}
        <div className="mt-16 border-t border-border pt-8 text-center">
          <p className="text-sm italic text-muted-foreground">
            For updates, follow @sportsblockinfo on X or visit sportsblock.app
          </p>
          <p className="mt-4 text-sm font-bold text-muted-foreground">End of Whitepaper</p>
          <div className="mt-8">
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
