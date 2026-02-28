import Link from 'next/link';
import {
  ArrowLeft,
  Globe,
  Link2,
  UserPlus,
  PenLine,
  ThumbsUp,
  Lock,
  Medal,
  Wallet,
  Lightbulb,
} from 'lucide-react';

export const revalidate = 86400;

const sections = [
  { id: 'what-is-sportsblock', label: 'What is Sportsblock?' },
  { id: 'how-hive-works', label: 'How Hive Works' },
  { id: 'signing-up', label: 'Signing Up' },
  { id: 'posting', label: 'Posting & Sportsbites' },
  { id: 'voting', label: 'Voting & Curation' },
  { id: 'staking', label: 'Staking & HIVE Power' },
  { id: 'medals', label: 'MEDALS Token' },
  { id: 'wallet', label: 'Your Wallet' },
  { id: 'tips', label: 'Tips for New Users' },
] as const;

function SectionCard({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="mb-3 text-xl font-semibold text-foreground">{title}</h2>
          <div className="space-y-4 leading-relaxed text-muted-foreground">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SPORTSBLOCK
        </Link>

        <h1 className="mb-2 text-3xl font-bold">Getting Started</h1>
        <p className="mb-10 text-sm text-muted-foreground">
          Everything you need to know to get the most out of SPORTSBLOCK
        </p>

        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
          {/* Sticky TOC sidebar - desktop only */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                On this page
              </p>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="prose prose-sm max-w-none space-y-12">
            <SectionCard id="what-is-sportsblock" icon={Globe} title="What is SPORTSBLOCK?">
              <p>
                SPORTSBLOCK is a sports content platform built on the Hive blockchain. It brings
                together sports fans, writers, and analysts in a community where quality content is
                rewarded with real cryptocurrency.
              </p>
              <p>
                Unlike traditional sports platforms, everything you post on SPORTSBLOCK is stored on
                the blockchain. That means no central authority can censor, remove, or alter your
                contributions &mdash; you truly own your content.
              </p>
            </SectionCard>

            <SectionCard id="how-hive-works" icon={Link2} title="How Hive Works">
              <p>
                <a
                  href="https://hive.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Hive
                </a>{' '}
                is a fast, feeless blockchain designed for social applications. When you post,
                comment, or vote on SPORTSBLOCK, those actions are recorded on the Hive blockchain.
              </p>
              <p>Key things to know:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>No transaction fees.</strong> Posting, voting, and commenting are free.
                  Instead, you use &quot;Resource Credits&quot; (RC) that regenerate over time.
                </li>
                <li>
                  <strong>Censorship resistant.</strong> Content is stored across a decentralized
                  network of nodes &mdash; nobody can take down your posts.
                </li>
                <li>
                  <strong>Your account, your keys.</strong> Your Hive account is secured by
                  cryptographic keys that only you control. No passwords stored on a server.
                </li>
                <li>
                  <strong>7-day reward window.</strong> Posts earn rewards through upvotes during
                  their first 7 days. After that, rewards are distributed and the post remains
                  permanently on-chain.
                </li>
              </ul>
            </SectionCard>

            <SectionCard id="signing-up" icon={UserPlus} title="Signing Up">
              <p>There are two ways to join SPORTSBLOCK:</p>

              <div className="rounded-lg border border-border p-4">
                <h3 className="mb-2 font-semibold text-foreground">Option 1: Google Sign-In</h3>
                <p>
                  The easiest way to get started. Sign in with your Google account and we&apos;ll
                  create a Hive account for you during onboarding. You&apos;ll pick a username
                  (prefixed with <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sb-</code>
                  ) and download your private keys.
                </p>
                <p className="mt-2 text-sm">
                  <strong>Important:</strong> Save your keys somewhere safe. They&apos;re the only
                  way to recover your account if you lose access.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="mb-2 font-semibold text-foreground">Option 2: Hive Wallet</h3>
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
                  (browser extension) or HiveSigner. This gives you full control with your existing
                  keys.
                </p>
              </div>
            </SectionCard>

            <SectionCard id="posting" icon={PenLine} title="Posting & Sportsbites">
              <p>SPORTSBLOCK has two types of content:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>Posts:</strong> Full-length articles with titles, rich text formatting,
                  images, and tags. Great for in-depth analysis, match reviews, and opinion pieces.
                </li>
                <li>
                  <strong>Sportsbites:</strong> Short-form, tweet-like takes for quick reactions,
                  hot takes, and real-time sports discussion.
                </li>
              </ul>

              <p>Things to keep in mind when posting:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>7-day reward window:</strong> Your post earns upvote rewards for 7 days
                  after publishing. After that, rewards are paid out to you and your voters.
                </li>
                <li>
                  <strong>Resource Credits:</strong> Every action on Hive uses RC, which regenerates
                  at about 20% per day. New accounts start with enough RC for several posts and
                  comments daily.
                </li>
                <li>
                  <strong>Editing:</strong> You can edit posts within the 7-day window. After
                  payout, edits are still possible but won&apos;t affect rewards.
                </li>
                <li>
                  <strong>Permanent:</strong> Posts live on the blockchain forever. You can edit
                  content, but the history is preserved.
                </li>
              </ul>
            </SectionCard>

            <SectionCard id="voting" icon={ThumbsUp} title="Voting & Curation">
              <p>
                Upvoting content on SPORTSBLOCK isn&apos;t just a &quot;like&quot; &mdash; it
                distributes real rewards to the author and earns you curation rewards in return.
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>Voting Power:</strong> You have a voting power bar that starts at 100%.
                  Each full-strength vote uses about 2% of your voting power. It regenerates at
                  roughly 20% per day.
                </li>
                <li>
                  <strong>Vote weight:</strong> You can adjust vote weight to conserve voting power.
                  A 50% weight vote uses ~1% of your voting power.
                </li>
                <li>
                  <strong>Curation rewards:</strong> When you upvote a post that earns rewards, you
                  receive a share of the curation pool (roughly 50% of the post&apos;s total rewards
                  go to curators).
                </li>
                <li>
                  <strong>Timing matters:</strong> Voting earlier on quality content can earn you
                  more curation rewards, as the curation reward algorithm favors early voters.
                </li>
              </ul>
            </SectionCard>

            <SectionCard id="staking" icon={Lock} title="Staking & HIVE Power">
              <p>
                &quot;Staking&quot; HIVE means converting liquid HIVE tokens into HIVE Power (HP).
                This is also called &quot;powering up.&quot;
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>Why stake?</strong> More HIVE Power means your upvotes are worth more, you
                  earn more curation rewards, and you have more Resource Credits for actions on the
                  blockchain.
                </li>
                <li>
                  <strong>Power Down:</strong> You can unstake (power down) at any time, but it
                  takes 13 weeks. Your HIVE is returned in equal weekly installments over that
                  period.
                </li>
                <li>
                  <strong>Delegation:</strong> You can delegate your HIVE Power to other accounts
                  without transferring ownership. This is often used to support communities or new
                  users.
                </li>
                <li>
                  <strong>Influence:</strong> HIVE Power also determines your influence in
                  governance votes (witness voting) on the Hive blockchain.
                </li>
              </ul>
            </SectionCard>

            <SectionCard id="medals" icon={Medal} title="MEDALS Token">
              <p>
                MEDALS is SPORTSBLOCK&apos;s native Hive Engine token. It rewards active community
                members and unlocks platform benefits based on how much you stake.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 pr-4 text-left font-semibold text-foreground">Tier</th>
                      <th className="pb-2 pr-4 text-left font-semibold text-foreground">
                        Staked MEDALS
                      </th>
                      <th className="pb-2 text-left font-semibold text-foreground">Benefits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2 pr-4 font-medium text-foreground">Bronze</td>
                      <td className="py-2 pr-4">100+</td>
                      <td className="py-2">Basic member badge, access to exclusive content</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-foreground">Silver</td>
                      <td className="py-2 pr-4">500+</td>
                      <td className="py-2">Enhanced visibility, priority support</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-foreground">Gold</td>
                      <td className="py-2 pr-4">2,000+</td>
                      <td className="py-2">Weekly reward distributions, featured content slots</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-foreground">Platinum</td>
                      <td className="py-2 pr-4">10,000+</td>
                      <td className="py-2">
                        Maximum rewards, governance participation, premium features
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                You can earn MEDALS through quality content, curation, and community participation.
                Stake them in your wallet to climb tiers and unlock weekly reward distributions.
              </p>
            </SectionCard>

            <SectionCard id="wallet" icon={Wallet} title="Your Wallet">
              <p>
                The{' '}
                <Link href="/wallet" className="text-primary hover:underline">
                  Wallet page
                </Link>{' '}
                shows everything about your on-chain balances:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>HIVE:</strong> Your liquid, transferable HIVE tokens.
                </li>
                <li>
                  <strong>HIVE Power (HP):</strong> Your staked HIVE &mdash; determines vote
                  strength and influence.
                </li>
                <li>
                  <strong>HBD:</strong> Hive Backed Dollars, a stablecoin pegged to ~$1 USD. You can
                  save HBD in Hive savings to earn ~20% APR interest.
                </li>
                <li>
                  <strong>MEDALS:</strong> Your SPORTSBLOCK token balance and staking tier.
                </li>
                <li>
                  <strong>Resource Credits:</strong> How much blockchain activity you can do before
                  needing to wait for regeneration.
                </li>
              </ul>
              <p>
                From the wallet, you can transfer tokens, power up/down, stake MEDALS, and view your
                transaction history.
              </p>
            </SectionCard>

            <SectionCard id="tips" icon={Lightbulb} title="Tips for New Users">
              <ol className="list-decimal space-y-3 pl-6">
                <li>
                  <strong>Introduce yourself.</strong> Write a short intro post telling the
                  community about your sports interests. It&apos;s a great way to get your first
                  upvotes.
                </li>
                <li>
                  <strong>Engage with others.</strong> Comment on posts you enjoy. Quality comments
                  can earn rewards too, and they help you build connections.
                </li>
                <li>
                  <strong>Be consistent.</strong> Regular posting and curation builds your
                  reputation and following over time.
                </li>
                <li>
                  <strong>Use tags wisely.</strong> Add relevant sport tags to help people discover
                  your content (e.g., football, basketball, cricket).
                </li>
                <li>
                  <strong>Don&apos;t drain your voting power.</strong> Aim to keep your voting power
                  above 80% for optimal reward distribution. Vote selectively on content you
                  genuinely value.
                </li>
                <li>
                  <strong>Save your keys.</strong> If you signed up with Google, make sure
                  you&apos;ve downloaded and securely stored your Hive private keys. Without them,
                  account recovery is difficult.
                </li>
                <li>
                  <strong>Explore communities.</strong> Check out the{' '}
                  <Link href="/communities" className="text-primary hover:underline">
                    Communities page
                  </Link>{' '}
                  to find sports communities that match your interests.
                </li>
              </ol>
            </SectionCard>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-wrap gap-4">
            <Link href="/about" className="text-sm text-primary hover:underline">
              About
            </Link>
            <Link href="/legal/terms" className="text-sm text-primary hover:underline">
              Terms of Service
            </Link>
            <Link href="/legal/privacy" className="text-sm text-primary hover:underline">
              Privacy Policy
            </Link>
            <Link href="/legal/cookies" className="text-sm text-primary hover:underline">
              Cookie Policy
            </Link>
            <Link
              href="/legal/community-guidelines"
              className="text-sm text-primary hover:underline"
            >
              Community Guidelines
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
