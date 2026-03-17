import type { Metadata } from 'next';
import Link from 'next/link';
import { Trophy, Coins, Medal, Lock, Gift, ArrowLeftRight } from 'lucide-react';
import { SEOPageLayout, SectionCard } from '@/components/seo/SEOPageLayout';
import { CTABanner } from '@/components/seo/CTABanner';

const BASE_URL = 'https://sportsblock.app';

export const metadata: Metadata = {
  title: 'MEDALS Token: Earn, Stake & Unlock Rewards | Sportsblock',
  description:
    "Learn about MEDALS, Sportsblock's native Hive Engine token. Earn MEDALS through content creation and curation, stake to unlock tiered rewards, and participate in weekly distributions.",
  alternates: { canonical: `${BASE_URL}/medals-token` },
  openGraph: {
    title: 'MEDALS Token: Earn, Stake & Unlock Rewards | Sportsblock',
    description:
      "MEDALS is Sportsblock's native token. Earn, stake, and unlock rewards in the sports crypto ecosystem.",
    url: `${BASE_URL}/medals-token`,
    siteName: 'Sportsblock',
    type: 'website',
  },
};

export const revalidate = 86400;

const faqItems = [
  {
    question: 'What is the MEDALS token?',
    answer:
      "MEDALS is Sportsblock's native Hive Engine token. It rewards active community members who create and curate sports content. By staking MEDALS, you unlock tiered benefits and participate in weekly reward distributions.",
  },
  {
    question: 'How do I earn MEDALS?',
    answer:
      'You earn MEDALS by publishing quality sports content (posts and Sportsbites), curating content through upvotes, leaving thoughtful comments, making accurate predictions, and maintaining consistent activity on the platform.',
  },
  {
    question: "What's the difference between MEDALS and HIVE?",
    answer:
      "HIVE is the main blockchain token that powers all Hive applications. MEDALS is Sportsblock's specific community token built on Hive Engine. HIVE determines your voting power across the blockchain, while MEDALS unlock Sportsblock-specific benefits and rewards.",
  },
  {
    question: 'Can I sell or trade MEDALS?',
    answer:
      'Yes. MEDALS is a Hive Engine token that can be traded on the Hive Engine DEX (decentralized exchange). You can also stake MEDALS for long-term rewards or unstake them to make them liquid for trading.',
  },
  {
    question: 'How often are staking rewards distributed?',
    answer:
      'Staking rewards are distributed weekly. The amount you receive depends on your staking tier and overall platform activity for that week. Higher tiers receive a larger share of the reward pool.',
  },
];

function jsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: 'MEDALS Token: Earn, Stake & Unlock Rewards',
        description: 'Complete guide to the MEDALS token on Sportsblock.',
        url: `${BASE_URL}/medals-token`,
        isPartOf: { '@type': 'WebSite', name: 'Sportsblock', url: BASE_URL },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'MEDALS Token',
            item: `${BASE_URL}/medals-token`,
          },
        ],
      },
    ],
  };
}

export default function MedalsTokenPage() {
  const ldJson = JSON.stringify(jsonLd());

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson }} />
      <SEOPageLayout
        title="MEDALS Token"
        subtitle="Sportsblock's native reward token — earn, stake, and unlock exclusive benefits."
        footerLinks={[
          { href: '/earn-crypto-sports', label: 'Earn Crypto From Sports' },
          { href: '/start-sports-blog', label: 'Start a Sports Blog' },
          { href: '/leaderboard', label: 'Leaderboard' },
          { href: '/about', label: 'About' },
        ]}
      >
        <SectionCard id="what-is-medals" icon={Trophy} title="What is MEDALS?">
          <p>
            MEDALS is Sportsblock&apos;s native community token, built on{' '}
            <a
              href="https://hive-engine.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Hive Engine
            </a>{' '}
            — a smart contract layer on top of the Hive blockchain. While HIVE and HBD are the main
            currencies you earn from content upvotes, MEDALS adds a Sportsblock-specific reward
            layer that recognises and incentivises active community members.
          </p>
          <p>
            Think of MEDALS as a loyalty and rewards token specifically for the Sportsblock
            ecosystem. The more you contribute — through writing, curating, predicting, and engaging
            — the more MEDALS you accumulate. Staking your MEDALS unlocks tiered benefits and weekly
            reward distributions.
          </p>
          <p>
            MEDALS is a tradeable Hive Engine token. You can hold it, stake it for rewards, or trade
            it on the Hive Engine decentralized exchange. Your tokens, your choice.
          </p>
        </SectionCard>

        <SectionCard id="how-to-earn" icon={Coins} title="How to Earn MEDALS">
          <p>
            There are multiple ways to earn MEDALS on Sportsblock. The more active and valuable your
            contributions, the more you earn:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Publishing content.</strong> Writing posts and Sportsbites that receive
              upvotes earns you MEDALS alongside your HIVE and HBD rewards.
            </li>
            <li>
              <strong>Curating content.</strong> Upvoting quality posts before others discover them
              earns curation MEDALS.
            </li>
            <li>
              <strong>Commenting.</strong> Thoughtful, substantive comments that receive upvotes
              contribute to your MEDALS earnings.
            </li>
            <li>
              <strong>Predictions.</strong> Making accurate sports predictions on Sportsblock&apos;s
              prediction markets earns MEDALS bonuses.
            </li>
            <li>
              <strong>Consistency.</strong> Regular activity (daily posting, voting, and engaging)
              builds up your MEDALS earnings over time. Streaks matter.
            </li>
          </ul>
          <p>
            MEDALS are distributed based on your overall contribution to the platform. Quality and
            consistency both count — a few well-received posts earn more MEDALS than many low-effort
            ones.
          </p>
        </SectionCard>

        <SectionCard id="staking-tiers" icon={Medal} title="Staking Tiers">
          <p>
            Staking your MEDALS locks them in your account and unlocks benefits based on your tier.
            The more you stake, the higher your tier and the greater your rewards:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sb-border">
                  <th className="pb-2 pr-4 text-left font-semibold text-sb-text-primary">Tier</th>
                  <th className="pb-2 pr-4 text-left font-semibold text-sb-text-primary">
                    Staked MEDALS
                  </th>
                  <th className="pb-2 text-left font-semibold text-sb-text-primary">Benefits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sb-border">
                <tr>
                  <td className="py-2 pr-4 font-medium text-sb-text-primary">Bronze</td>
                  <td className="py-2 pr-4">1,000+</td>
                  <td className="py-2">Member badge, access to exclusive content channels</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-sb-text-primary">Silver</td>
                  <td className="py-2 pr-4">5,000+</td>
                  <td className="py-2">
                    Enhanced content visibility, priority support, weekly rewards
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-sb-text-primary">Gold</td>
                  <td className="py-2 pr-4">25,000+</td>
                  <td className="py-2">
                    Featured content slots, larger weekly reward share, community governance
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-sb-text-primary">Platinum</td>
                  <td className="py-2 pr-4">100,000+</td>
                  <td className="py-2">
                    Maximum reward multiplier, premium features, platform governance voting
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Staking is done through your{' '}
            <Link href="/wallet" className="text-primary hover:underline">
              wallet page
            </Link>
            . You can unstake at any time, though there may be a cooldown period before tokens
            become liquid again.
          </p>
        </SectionCard>

        <SectionCard id="how-to-stake" icon={Lock} title="How to Stake MEDALS">
          <p>Staking your MEDALS is straightforward:</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              Navigate to your{' '}
              <Link href="/wallet" className="text-primary hover:underline">
                wallet
              </Link>
              .
            </li>
            <li>Find your MEDALS balance in the Hive Engine tokens section.</li>
            <li>Click &quot;Stake&quot; and enter the amount you want to stake.</li>
            <li>Confirm the transaction through your wallet (Hive Keychain or managed signing).</li>
          </ol>
          <p>
            Once staked, your MEDALS immediately count toward your tier level. If you reach a new
            tier threshold, your benefits activate right away.
          </p>
          <p>
            <strong>Tip:</strong> You don&apos;t need to stake all your MEDALS at once. Many users
            stake gradually as they earn, watching their tier progress over time.
          </p>
        </SectionCard>

        <SectionCard id="weekly-rewards" icon={Gift} title="Weekly Reward Distributions">
          <p>
            Every week, a portion of the MEDALS reward pool is distributed to stakers. The amount
            you receive depends on:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Your staking tier.</strong> Higher tiers receive a proportionally larger share
              of the weekly distribution.
            </li>
            <li>
              <strong>Your activity level.</strong> Active stakers (those who post, vote, and engage
              regularly) receive a bonus on their weekly distribution.
            </li>
            <li>
              <strong>Overall platform activity.</strong> The reward pool grows with platform usage,
              so more community activity means larger distributions for everyone.
            </li>
          </ul>
          <p>
            Weekly rewards are automatically deposited to your account. You can check distribution
            history and track your rewards on the{' '}
            <Link href="/leaderboard" className="text-primary hover:underline">
              leaderboard
            </Link>
            .
          </p>
        </SectionCard>

        <SectionCard
          id="medals-vs-hive"
          icon={ArrowLeftRight}
          title="MEDALS vs HIVE: Understanding Both"
        >
          <p>New users often wonder how MEDALS relates to HIVE. Here&apos;s a clear breakdown:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sb-border">
                  <th className="pb-2 pr-4 text-left font-semibold text-sb-text-primary">Aspect</th>
                  <th className="pb-2 pr-4 text-left font-semibold text-sb-text-primary">
                    HIVE / HBD
                  </th>
                  <th className="pb-2 text-left font-semibold text-sb-text-primary">MEDALS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sb-border">
                <tr>
                  <td className="py-2 pr-4 font-medium text-sb-text-primary">Scope</td>
                  <td className="py-2 pr-4">Entire Hive blockchain</td>
                  <td className="py-2">Sportsblock-specific</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-sb-text-primary">How you earn</td>
                  <td className="py-2 pr-4">Content upvotes (author + curation)</td>
                  <td className="py-2">Content, curation, predictions, activity</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-sb-text-primary">Staking benefit</td>
                  <td className="py-2 pr-4">HIVE Power increases vote strength</td>
                  <td className="py-2">Tiered rewards + weekly distributions</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-sb-text-primary">Trading</td>
                  <td className="py-2 pr-4">Major crypto exchanges</td>
                  <td className="py-2">Hive Engine DEX</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-sb-text-primary">Best for</td>
                  <td className="py-2 pr-4">Broad blockchain participation</td>
                  <td className="py-2">Sportsblock community engagement</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Both tokens work together. HIVE rewards your content across the entire blockchain, while
            MEDALS rewards your specific contribution to the Sportsblock community. Active users
            earn both simultaneously — they&apos;re complementary, not competing.
          </p>
          <p>
            For a deeper dive into the full earnings picture, see our{' '}
            <Link href="/earn-crypto-sports" className="text-primary hover:underline">
              guide to earning crypto from sports
            </Link>
            .
          </p>
        </SectionCard>

        {/* FAQ section */}
        <section>
          <h2 className="mb-6 text-xl font-semibold text-sb-text-primary">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqItems.map((item) => (
              <div key={item.question}>
                <h3 className="mb-2 font-semibold text-sb-text-primary">{item.question}</h3>
                <p className="text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <CTABanner
          heading="Start Earning MEDALS"
          description="Join Sportsblock and start earning MEDALS through your sports content and community engagement."
          primaryHref="/auth"
          primaryLabel="Create Free Account"
          secondaryHref="/whitepaper"
          secondaryLabel="Read the Whitepaper"
        />
      </SEOPageLayout>
    </>
  );
}
