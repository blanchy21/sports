import type { Metadata } from 'next';
import Link from 'next/link';
import { DollarSign, Zap, TrendingUp, Shield, Medal, UserPlus } from 'lucide-react';
import { SEOPageLayout, SectionCard } from '@/components/seo/SEOPageLayout';
import { CTABanner } from '@/components/seo/CTABanner';

const BASE_URL = 'https://sportsblock.app';

export const metadata: Metadata = {
  title: 'Earn Crypto From Sports Content | Sportsblock',
  description:
    'Turn your sports knowledge into real cryptocurrency. Write about the sports you love and earn HIVE, HBD, and MEDALS tokens on Sportsblock — no investment required.',
  alternates: { canonical: `${BASE_URL}/earn-crypto-sports` },
  openGraph: {
    title: 'Earn Crypto From Sports Content | Sportsblock',
    description:
      'Turn your sports knowledge into real cryptocurrency. Write about the sports you love and earn HIVE, HBD, and MEDALS tokens.',
    url: `${BASE_URL}/earn-crypto-sports`,
    siteName: 'Sportsblock',
    type: 'website',
  },
};

export const revalidate = 86400;

const faqItems = [
  {
    question: 'How much can I earn writing about sports on Sportsblock?',
    answer:
      'Earnings depend on the quality of your content and community engagement. New contributors typically earn $0.01–$0.50 per post, while established writers with a following regularly earn $3–$10+ per article. Top contributors who consistently produce valuable analysis can earn significantly more.',
  },
  {
    question: 'Do I need to invest money to start earning?',
    answer:
      'No. Sportsblock is completely free to join and use. You earn cryptocurrency through community upvotes on your content — there is no buy-in, subscription fee, or minimum investment required.',
  },
  {
    question: 'What cryptocurrencies can I earn on Sportsblock?',
    answer:
      "You can earn three types of tokens: HIVE (the main blockchain token), HBD (Hive Backed Dollars, a stablecoin pegged to ~$1 USD), and MEDALS (Sportsblock's native reward token for community engagement).",
  },
  {
    question: 'How do rewards work on the Hive blockchain?',
    answer:
      'When you publish content on Sportsblock, the community can upvote your posts for 7 days. Each upvote allocates a portion of the Hive reward pool to your post. After 7 days, rewards are distributed — roughly 50% goes to the author and 50% to curators who upvoted.',
  },
  {
    question: 'Can I withdraw my earnings to real money?',
    answer:
      'Yes. HIVE and HBD are traded on cryptocurrency exchanges. You can transfer your tokens to an exchange and convert them to your local currency. HBD is particularly convenient as it maintains a stable ~$1 value.',
  },
];

function jsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: 'Earn Crypto From Sports Content | Sportsblock',
        description: 'Turn your sports knowledge into real cryptocurrency on Sportsblock.',
        url: `${BASE_URL}/earn-crypto-sports`,
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
            name: 'Earn Crypto From Sports',
            item: `${BASE_URL}/earn-crypto-sports`,
          },
        ],
      },
    ],
  };
}

export default function EarnCryptoSportsPage() {
  const ldJson = JSON.stringify(jsonLd());

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson }} />
      <SEOPageLayout
        title="Earn Crypto From Your Sports Knowledge"
        subtitle="Your analysis, predictions, and hot takes are worth real money — here's how Sportsblock makes it happen."
        footerLinks={[
          { href: '/getting-started', label: 'Getting Started' },
          { href: '/start-sports-blog', label: 'Start a Sports Blog' },
          { href: '/medals-token', label: 'MEDALS Token' },
          { href: '/about', label: 'About' },
        ]}
      >
        <SectionCard
          id="why-your-knowledge-has-value"
          icon={DollarSign}
          title="Why Your Sports Knowledge Has Value"
        >
          <p>
            Sports fans spend hours watching games, studying stats, and debating outcomes. On
            traditional platforms, all that expertise generates ad revenue for the platform — and
            nothing for you.
          </p>
          <p>
            Sportsblock changes this equation. Built on the{' '}
            <a
              href="https://hive.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Hive blockchain
            </a>
            , Sportsblock is a sports content platform where community upvotes translate directly
            into cryptocurrency rewards. The better your content, the more you earn — and it costs
            nothing to start.
          </p>
          <p>
            Whether you write detailed match analysis, share quick post-game reactions, or make bold
            predictions, every piece of content you create has earning potential. There are no
            algorithms hiding your posts behind a paywall. If the community values your
            contribution, you get paid.
          </p>
        </SectionCard>

        <SectionCard id="how-rewards-work" icon={Zap} title="How Sportsblock Rewards Work">
          <p>
            The reward system is straightforward: <strong>write, get upvoted, earn crypto</strong>.
          </p>
          <p>
            When you publish a post or Sportsbite (a short-form take), it enters a 7-day reward
            window. During this period, other users can upvote your content. Each upvote allocates a
            portion of the Hive blockchain&apos;s daily reward pool to your post.
          </p>
          <p>
            After 7 days, rewards are distributed automatically. Roughly 50% goes to you as the
            author, and 50% goes to the curators who upvoted your content. This means you also earn
            by discovering and upvoting good content from others.
          </p>
          <p>
            Rewards are paid in two tokens: <strong>HIVE</strong> (the blockchain&apos;s native
            token) and <strong>HBD</strong> (Hive Backed Dollars, a stablecoin pegged to ~$1 USD).
            Both are real cryptocurrencies you can trade, hold, or convert to cash.
          </p>
        </SectionCard>

        <SectionCard id="what-can-you-earn" icon={TrendingUp} title="What Can You Earn?">
          <p>
            Earnings vary based on the quality and engagement of your content. Here&apos;s what
            contributors at different stages typically earn per post:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 pr-4 text-left font-semibold text-foreground">Stage</th>
                  <th className="pb-2 pr-4 text-left font-semibold text-foreground">
                    Typical Earnings
                  </th>
                  <th className="pb-2 text-left font-semibold text-foreground">What It Takes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Getting Started</td>
                  <td className="py-2 pr-4">$0.01 – $0.50</td>
                  <td className="py-2">First posts, building initial connections</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Building Reputation</td>
                  <td className="py-2 pr-4">$0.50 – $3.00</td>
                  <td className="py-2">Regular posting, engaging with community</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Established</td>
                  <td className="py-2 pr-4">$3.00 – $10.00</td>
                  <td className="py-2">Consistent quality, growing follower base</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Top Contributor</td>
                  <td className="py-2 pr-4">$5.00 – $10.00+</td>
                  <td className="py-2">Recognized expert, strong community engagement</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            These figures grow as the platform and community expand. Early contributors who build a
            reputation now position themselves to earn more as Sportsblock grows.
          </p>
        </SectionCard>

        <SectionCard
          id="why-sportsblock-is-different"
          icon={Shield}
          title="Why Sportsblock is Different"
        >
          <p>
            Most &quot;earn money online&quot; platforms require an upfront investment, charge fees,
            or hide earnings behind complicated token economics. Sportsblock is fundamentally
            different:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Zero fees.</strong> Posting, commenting, and voting on the Hive blockchain is
              completely free. No gas fees, no transaction costs, no subscription required.
            </li>
            <li>
              <strong>No investment needed.</strong> You don&apos;t need to buy tokens to earn. Your
              content and engagement are all you need.
            </li>
            <li>
              <strong>True content ownership.</strong> Everything you publish is stored on the
              blockchain. No company can delete your posts, ban your account, or claim your content.
            </li>
            <li>
              <strong>No paywall.</strong> All content on Sportsblock is free to read. Your earnings
              come from the blockchain reward pool, not from readers paying to access your work.
            </li>
            <li>
              <strong>Transparent rewards.</strong> You can see exactly how much each post earns and
              who voted on it. No hidden algorithms deciding your payout.
            </li>
          </ul>
        </SectionCard>

        <SectionCard id="medals-token-bonus" icon={Medal} title="MEDALS Token Bonus">
          <p>
            Beyond HIVE and HBD, active Sportsblock contributors earn{' '}
            <Link href="/medals-token" className="text-primary hover:underline">
              MEDALS tokens
            </Link>{' '}
            — the platform&apos;s native reward token. MEDALS unlock additional benefits when
            staked:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Tiered membership badges (Bronze through Platinum)</li>
            <li>Weekly reward distributions to stakers</li>
            <li>Enhanced visibility for your content</li>
            <li>Access to exclusive features and community channels</li>
          </ul>
          <p>
            MEDALS rewards compound your earnings — the more you contribute, the more MEDALS you
            earn, and the more benefits you unlock.
          </p>
        </SectionCard>

        <SectionCard id="get-started" icon={UserPlus} title="Getting Started in 3 Minutes">
          <p>Starting on Sportsblock is simple:</p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              <strong>Create a free account.</strong>{' '}
              <Link href="/auth" className="text-primary hover:underline">
                Sign up with Google
              </Link>{' '}
              or connect an existing Hive wallet. No crypto experience required.
            </li>
            <li>
              <strong>Write your first post.</strong> Share your take on a recent game, a player
              trade, or an upcoming match. Check our{' '}
              <Link href="/getting-started" className="text-primary hover:underline">
                getting started guide
              </Link>{' '}
              for tips.
            </li>
            <li>
              <strong>Engage with the community.</strong> Upvote content you enjoy, leave thoughtful
              comments, and follow writers whose analysis you value.
            </li>
          </ol>
          <p>
            That&apos;s it. No payment details, no credit card, no token purchase. Your sports
            knowledge is your entry ticket.
          </p>
        </SectionCard>

        {/* FAQ section */}
        <section>
          <h2 className="mb-6 text-xl font-semibold text-foreground">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqItems.map((item) => (
              <div key={item.question}>
                <h3 className="mb-2 font-semibold text-foreground">{item.question}</h3>
                <p className="text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <CTABanner
          heading="Start Earning Today"
          description="Join thousands of sports fans turning their knowledge into crypto. Free to start, no investment required."
          primaryHref="/auth"
          primaryLabel="Create Free Account"
          secondaryHref="/start-sports-blog"
          secondaryLabel="Learn How to Start"
        />
      </SEOPageLayout>
    </>
  );
}
