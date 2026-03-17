import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe, UserPlus, PenLine, MessageSquare, ThumbsUp, Wallet, Lightbulb } from 'lucide-react';
import { SEOPageLayout, SectionCard } from '@/components/seo/SEOPageLayout';
import { CTABanner } from '@/components/seo/CTABanner';

const BASE_URL = 'https://sportsblock.app';

export const metadata: Metadata = {
  title: 'How to Start a Sports Blog and Earn Crypto | Sportsblock',
  description:
    'Step-by-step guide to starting a sports blog on Sportsblock. Write about the sports you love and earn HIVE, HBD, and MEDALS — completely free.',
  alternates: { canonical: `${BASE_URL}/start-sports-blog` },
  openGraph: {
    title: 'How to Start a Sports Blog and Earn Crypto | Sportsblock',
    description:
      'Step-by-step guide to starting a sports blog that earns cryptocurrency. Free to start.',
    url: `${BASE_URL}/start-sports-blog`,
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
        '@type': 'HowTo',
        name: 'How to Start a Sports Blog and Earn Crypto',
        description:
          'A step-by-step guide to creating a sports blog on Sportsblock and earning cryptocurrency from your content.',
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Create Your Free Account',
            text: 'Sign up with Google or connect a Hive wallet. No purchase or crypto experience required.',
            url: `${BASE_URL}/auth`,
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Write Your First Post',
            text: 'Use the built-in editor to write about any sport you follow. Add images, format text, and choose relevant tags.',
            url: `${BASE_URL}/publish`,
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: 'Share a Sportsbite',
            text: 'Post short-form takes and reactions using Sportsbites for quick engagement with the community.',
          },
          {
            '@type': 'HowToStep',
            position: 4,
            name: 'Engage and Curate',
            text: 'Upvote content you enjoy and leave thoughtful comments. Curation earns you rewards too.',
          },
          {
            '@type': 'HowToStep',
            position: 5,
            name: 'Track Your Earnings',
            text: 'Monitor your HIVE, HBD, and MEDALS earnings in your wallet dashboard.',
            url: `${BASE_URL}/wallet`,
          },
        ],
        totalTime: 'PT5M',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Start a Sports Blog',
            item: `${BASE_URL}/start-sports-blog`,
          },
        ],
      },
    ],
  };
}

export default function StartSportsBlogPage() {
  const ldJson = JSON.stringify(jsonLd());

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson }} />
      <SEOPageLayout
        title="How to Start a Sports Blog and Earn Crypto"
        subtitle="A step-by-step guide to turning your sports passion into a rewarding blog — completely free."
        footerLinks={[
          { href: '/earn-crypto-sports', label: 'Earn Crypto From Sports' },
          { href: '/medals-token', label: 'MEDALS Token' },
          { href: '/getting-started', label: 'Getting Started Guide' },
          { href: '/about', label: 'About' },
        ]}
      >
        <SectionCard id="why-start-in-2026" icon={Globe} title="Why Start a Sports Blog in 2026?">
          <p>
            Sports blogging has never been more accessible — or more rewarding. Traditional
            platforms like Medium, WordPress, or Substack let you write, but monetisation usually
            means paywalls, ads, or hitting a subscriber count most writers never reach.
          </p>
          <p>
            Sportsblock is different. Built on the{' '}
            <a
              href="https://hive.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Hive blockchain
            </a>
            , it rewards every piece of content from day one. There&apos;s no minimum follower
            count, no paywall to set up, and no waiting period. When someone upvotes your post, you
            earn cryptocurrency. It&apos;s that simple.
          </p>
          <p>
            The sports content market is growing, and blockchain-based platforms are gaining
            traction with readers who want censorship-resistant, creator-owned content. Starting now
            means you&apos;re building a reputation and following on a platform that&apos;s still
            early — which historically is when the biggest opportunities exist.
          </p>
        </SectionCard>

        <SectionCard id="step-1-account" icon={UserPlus} title="Step 1: Create Your Free Account">
          <p>
            Getting started takes less than two minutes. Head to the{' '}
            <Link href="/auth" className="text-primary hover:underline">
              sign-up page
            </Link>{' '}
            and choose one of two options:
          </p>
          <div className="rounded-lg border border-sb-border p-4">
            <h3 className="mb-2 font-semibold text-sb-text-primary">Google Sign-In (Easiest)</h3>
            <p>
              Sign in with your Google account. Sportsblock will create a Hive blockchain account
              for you automatically during onboarding. You&apos;ll pick a username and download your
              private keys (keep these safe — they&apos;re your account backup).
            </p>
          </div>
          <div className="rounded-lg border border-sb-border p-4">
            <h3 className="mb-2 font-semibold text-sb-text-primary">
              Hive Wallet (For Existing Users)
            </h3>
            <p>
              If you already have a Hive account, connect directly using{' '}
              <a
                href="https://hive-keychain.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Hive Keychain
              </a>{' '}
              or HiveSigner. This gives you full control with your existing keys.
            </p>
          </div>
          <p>
            Either way, there&apos;s no payment required. Your account is completely free, and you
            can start posting immediately after setup.
          </p>
        </SectionCard>

        <SectionCard id="step-2-first-post" icon={PenLine} title="Step 2: Write Your First Post">
          <p>
            Navigate to the{' '}
            <Link href="/publish" className="text-primary hover:underline">
              publish page
            </Link>{' '}
            to create your first full-length article. The editor supports:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Rich text formatting with Markdown</li>
            <li>Image uploads and embeds</li>
            <li>Tags for categorising your content by sport</li>
            <li>Draft saving so you can write at your own pace</li>
            <li>Scheduling to publish at the optimal time</li>
          </ul>
          <p>
            <strong>What should you write about?</strong> Anything sports-related that you&apos;re
            passionate about. Match analysis, transfer rumours, player profiles, opinion pieces,
            season previews — the community rewards original thinking and genuine expertise.
          </p>
          <p>
            <strong>Pro tip:</strong> Your first post is a great opportunity to introduce yourself.
            Tell the community which sports you follow, your favourite teams, and what kind of
            content you plan to create. Introduction posts tend to get a warm reception.
          </p>
        </SectionCard>

        <SectionCard id="step-3-sportsbite" icon={MessageSquare} title="Step 3: Share a Sportsbite">
          <p>
            Not every thought needs a full article. Sportsbites are short-form, tweet-style posts
            perfect for:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Quick post-game reactions</li>
            <li>Hot takes on breaking news</li>
            <li>Bold predictions before a match</li>
            <li>Stats and highlights worth discussing</li>
          </ul>
          <p>
            Sportsbites are published to the blockchain just like full posts and earn rewards
            through upvotes. They&apos;re a great way to stay active and visible in the community
            between longer articles.
          </p>
          <p>
            Many of the most successful Sportsblock creators combine long-form articles (2–3 per
            week) with daily Sportsbites to maintain a consistent presence.
          </p>
        </SectionCard>

        <SectionCard id="step-4-engage" icon={ThumbsUp} title="Step 4: Engage and Curate">
          <p>
            Writing is only half the equation. Engaging with other creators is equally important —
            and equally rewarding:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Upvote quality content.</strong> When you upvote a post that earns rewards,
              you receive curation rewards — roughly 50% of a post&apos;s total rewards go to
              curators. Early votes on good content earn the most.
            </li>
            <li>
              <strong>Leave thoughtful comments.</strong> Comments can earn upvotes and rewards too.
              A well-reasoned reply to a popular post can earn as much as your own articles.
            </li>
            <li>
              <strong>Follow creators you enjoy.</strong> Build your feed with content that
              interests you. The{' '}
              <Link href="/communities" className="text-primary hover:underline">
                communities page
              </Link>{' '}
              helps you find writers covering your favourite sports.
            </li>
          </ul>
          <p>
            Curation isn&apos;t just about earning — it&apos;s how you build relationships in the
            community. Writers notice and appreciate genuine engagement, and it&apos;s the fastest
            way to grow your own following.
          </p>
        </SectionCard>

        <SectionCard id="step-5-earnings" icon={Wallet} title="Step 5: Track Your Earnings">
          <p>
            Your{' '}
            <Link href="/wallet" className="text-primary hover:underline">
              wallet dashboard
            </Link>{' '}
            shows everything about your earnings:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>HIVE</strong> — The main blockchain token. Can be traded on exchanges or
              staked as HIVE Power to increase your voting influence.
            </li>
            <li>
              <strong>HBD</strong> — Hive Backed Dollars, a stablecoin worth ~$1 USD. You can save
              HBD in Hive savings to earn ~20% APR interest.
            </li>
            <li>
              <strong>MEDALS</strong> — Sportsblock&apos;s native token. Stake MEDALS to unlock{' '}
              <Link href="/medals-token" className="text-primary hover:underline">
                tiered rewards and benefits
              </Link>
              .
            </li>
          </ul>
          <p>
            Rewards from each post are distributed 7 days after publication. You can track pending
            payouts on your posts and see your complete earnings history in the wallet.
          </p>
        </SectionCard>

        <SectionCard id="tips" icon={Lightbulb} title="Tips for Sports Content That Earns">
          <p>
            Based on what works best for top Sportsblock creators, here are proven strategies for
            maximising your earnings:
          </p>
          <ol className="list-decimal space-y-3 pl-6">
            <li>
              <strong>Be timely.</strong> Posts about today&apos;s results, breaking trades, or
              upcoming matches get the most engagement. The sports world moves fast — reward
              yourself by being part of the conversation as it happens.
            </li>
            <li>
              <strong>Be original.</strong> Don&apos;t rehash what everyone already knows. Add your
              own analysis, data, or unique perspective. The community rewards insights they
              can&apos;t get elsewhere.
            </li>
            <li>
              <strong>Be consistent.</strong> Regular posting (3–5 times per week) builds your
              reputation faster than sporadic activity. Even short Sportsbites count.
            </li>
            <li>
              <strong>Use tags wisely.</strong> Relevant sport tags (football, basketball, cricket,
              etc.) help readers discover your content. Use 3–5 specific tags per post.
            </li>
            <li>
              <strong>Engage before and after posting.</strong> Spend 15 minutes upvoting and
              commenting on others&apos; content before you publish. This builds reciprocal
              relationships and increases visibility.
            </li>
            <li>
              <strong>Format well.</strong> Use headings, images, and lists to make your posts
              scannable. Well-formatted content earns more upvotes than walls of text.
            </li>
          </ol>
        </SectionCard>

        <CTABanner
          heading="Start Your Sports Blog Now"
          description="Join a growing community of sports writers earning crypto for their expertise. Free to start, no experience required."
          primaryHref="/auth"
          primaryLabel="Create Free Account"
          secondaryHref="/earn-crypto-sports"
          secondaryLabel="Learn About Earnings"
        />
      </SEOPageLayout>
    </>
  );
}
