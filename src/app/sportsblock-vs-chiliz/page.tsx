import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame, ArrowLeftRight, PenLine, DoorOpen, Lock } from 'lucide-react';
import { SEOPageLayout, SectionCard } from '@/components/seo/SEOPageLayout';
import { CTABanner } from '@/components/seo/CTABanner';
import { ComparisonTable } from '@/components/seo/ComparisonTable';

const BASE_URL = 'https://sportsblock.app';

export const metadata: Metadata = {
  title: 'Sportsblock vs Chiliz & Socios: Free Sports Crypto Alternative | Sportsblock',
  description:
    'Compare Sportsblock with Chiliz and Socios fan tokens. Discover a free, content-first alternative where you earn crypto without buying tokens first.',
  alternates: { canonical: `${BASE_URL}/sportsblock-vs-chiliz` },
  openGraph: {
    title: 'Sportsblock vs Chiliz & Socios: Free Sports Crypto Alternative',
    description:
      'Compare Sportsblock with Chiliz and Socios fan tokens. A free, content-first sports crypto platform.',
    url: `${BASE_URL}/sportsblock-vs-chiliz`,
    siteName: 'Sportsblock',
    type: 'website',
  },
};

export const revalidate = 86400;

function jsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: 'Sportsblock vs Chiliz & Socios',
        description:
          'A detailed comparison of Sportsblock and Chiliz/Socios sports crypto platforms.',
        url: `${BASE_URL}/sportsblock-vs-chiliz`,
        isPartOf: { '@type': 'WebSite', name: 'Sportsblock', url: BASE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Sportsblock vs Chiliz',
            item: `${BASE_URL}/sportsblock-vs-chiliz`,
          },
        ],
      },
    ],
  };
}

const comparisonRows = [
  {
    feature: 'Cost to start',
    values: ['Free — no purchase required', 'Must buy CHZ or fan tokens'],
  },
  {
    feature: 'How you earn',
    values: ['Write content → get upvoted → earn crypto', 'Buy tokens → hope price goes up'],
  },
  { feature: 'Content ownership', values: [true, false] },
  { feature: 'Transaction fees', values: ['None (Hive is feeless)', 'Gas fees on Chiliz Chain'] },
  {
    feature: 'Blockchain',
    values: ['Hive (fast, feeless, decentralized)', 'Chiliz Chain (proprietary)'],
  },
  { feature: 'Minimum investment', values: ['$0', '$10–$50+ for most fan tokens'] },
  {
    feature: 'Content creation tools',
    values: ['Full editor, Sportsbites, predictions', 'Polls and surveys only'],
  },
  {
    feature: 'Reward mechanism',
    values: ['Daily reward pool distributed to creators', 'Token price speculation'],
  },
  { feature: 'Censorship resistance', values: [true, false] },
  {
    feature: 'Withdraw earnings',
    values: ['Anytime, to any exchange', 'Limited to Chiliz ecosystem'],
  },
];

export default function SportsblockVsChilizPage() {
  const ldJson = JSON.stringify(jsonLd());

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson }} />
      <SEOPageLayout
        title="Sportsblock vs Chiliz & Socios"
        subtitle="Two approaches to sports and crypto — here's why content-first wins."
        footerLinks={[
          { href: '/earn-crypto-sports', label: 'Earn Crypto From Sports' },
          { href: '/start-sports-blog', label: 'Start a Sports Blog' },
          { href: '/about', label: 'About Sportsblock' },
        ]}
      >
        <SectionCard id="two-approaches" icon={Flame} title="Sports + Crypto: Two Approaches">
          <p>
            Chiliz and Socios pioneered the idea of combining sports fandom with cryptocurrency
            through fan tokens. Fans buy tokens associated with their favourite teams and
            participate in polls, earn rewards, and gain access to exclusive experiences. It&apos;s
            an exciting concept — but it comes with a significant catch.
          </p>
          <p>
            The fan token model requires fans to <em>spend money first</em>. You buy CHZ (the Chiliz
            token), exchange it for a team&apos;s fan token, and hope the token holds or increases
            in value. The &quot;rewards&quot; are often limited to voting on trivial decisions (like
            bus designs) and the real value comes from token price speculation.
          </p>
          <p>
            Sportsblock takes a fundamentally different approach.{' '}
            <strong>Instead of buying tokens, you earn them.</strong> Instead of speculating on
            prices, you create value through your sports knowledge. Instead of paying to
            participate, you get paid for participating.
          </p>
        </SectionCard>

        <SectionCard id="comparison" icon={ArrowLeftRight} title="Feature Comparison">
          <ComparisonTable headers={['Sportsblock', 'Chiliz / Socios']} rows={comparisonRows} />
        </SectionCard>

        <SectionCard id="content-first-wins" icon={PenLine} title="Why Content-First Wins">
          <p>
            The fundamental problem with the fan token model is that it asks fans to be investors
            first and fans second. The primary activity is buying and holding tokens, not engaging
            with sports content or community.
          </p>
          <p>
            Sportsblock flips this on its head. The primary activity is what sports fans already do
            — watch games, form opinions, discuss results, and analyse performance. Sportsblock
            simply adds a reward layer on top of this natural behaviour.
          </p>
          <p>
            On Sportsblock, you can write detailed match analysis, share quick-fire Sportsbites
            (short-form takes), make predictions, engage in discussions, and curate the best
            content. Every one of these activities can{' '}
            <Link href="/earn-crypto-sports" className="text-primary hover:underline">
              earn you cryptocurrency
            </Link>
            .
          </p>
          <p>
            This content-first approach means the platform&apos;s value grows with community
            activity, not token speculation. More great content attracts more readers, which drives
            more upvotes, which increases everyone&apos;s rewards. It&apos;s a virtuous cycle that
            benefits creators, not just early token buyers.
          </p>
        </SectionCard>

        <SectionCard id="zero-barriers" icon={DoorOpen} title="Zero Barriers to Entry">
          <p>
            One of the biggest criticisms of Chiliz and Socios is the cost barrier. To participate
            meaningfully, you need to buy CHZ tokens and exchange them for fan tokens. Depending on
            the team, this can cost $10–$50 or more just to get started. And if token prices drop,
            you lose money before you&apos;ve done anything.
          </p>
          <p>
            Sportsblock has zero cost to entry. You can{' '}
            <Link href="/auth" className="text-primary hover:underline">
              sign up with Google
            </Link>{' '}
            in under a minute, and you&apos;re immediately ready to start posting, commenting, and
            voting. The Hive blockchain has no transaction fees — every interaction is free, powered
            by regenerating Resource Credits instead of gas fees.
          </p>
          <p>
            This means anyone can start earning immediately, regardless of their financial
            situation. Your sports knowledge and writing ability are the only &quot;investment&quot;
            required.
          </p>
        </SectionCard>

        <SectionCard id="true-ownership" icon={Lock} title="True Ownership vs Platform Lock-in">
          <p>
            With Chiliz fan tokens, your assets are locked into the Chiliz ecosystem. While CHZ is
            traded on exchanges, individual fan tokens often have limited liquidity and are bound to
            the Socios platform. If Socios shuts down or changes terms, your tokens could lose all
            utility.
          </p>
          <p>
            Sportsblock is built on the Hive blockchain — a decentralized, open-source network that
            no single company controls. This gives you genuine ownership:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Your content lives on the blockchain.</strong> Even if Sportsblock the website
              went offline, your posts would remain accessible through any Hive frontend.
            </li>
            <li>
              <strong>Your tokens are yours.</strong> HIVE and HBD are traded on major
              cryptocurrency exchanges. You can withdraw anytime, with no platform restrictions.
            </li>
            <li>
              <strong>Your account is portable.</strong> Your Hive account works across dozens of
              Hive-based applications, not just Sportsblock.
            </li>
            <li>
              <strong>No censorship.</strong> Content is stored across a decentralized network of
              nodes. No company can delete your posts or freeze your account.
            </li>
          </ul>
        </SectionCard>

        <CTABanner
          heading="Try Sportsblock Free"
          description="No tokens to buy, no fees to pay. Start earning from your sports knowledge today."
          primaryHref="/auth"
          primaryLabel="Create Free Account"
          secondaryHref="/earn-crypto-sports"
          secondaryLabel="See How Earnings Work"
        />
      </SEOPageLayout>
    </>
  );
}
