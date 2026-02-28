import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const revalidate = 86400;

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SPORTSBLOCK
        </Link>

        <h1 className="mb-2 text-3xl font-bold">About SPORTSBLOCK</h1>
        <p className="mb-8 text-sm text-muted-foreground">Where Sports Meets Blockchain</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground dark:prose-invert">
          <section>
            <h2 className="mb-3 text-xl font-semibold">What is SPORTSBLOCK?</h2>
            <p className="leading-relaxed text-muted-foreground">
              SPORTSBLOCK is a sports content platform built on the Hive blockchain. We bring
              together sports fans, writers, and analysts in a community where quality content is
              rewarded and every interaction is transparent, decentralized, and owned by the users.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Unlike traditional sports platforms, SPORTSBLOCK gives creators true ownership of
              their content. Every post, comment, and vote is recorded on the Hive blockchain —
              meaning no central authority can censor, remove, or alter your contributions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Key Features</h2>
            <ul className="list-disc space-y-3 pl-6 text-muted-foreground">
              <li>
                <strong>Sports Content &amp; Discussion:</strong> Write articles, share analysis,
                and engage in discussions about all major sports — from football and basketball to
                rugby, cricket, and more.
              </li>
              <li>
                <strong>SportsBites:</strong> Quick-fire sports takes and micro-content for
                fast-moving conversations and real-time reactions.
              </li>
              <li>
                <strong>Predictions:</strong> Make sports predictions, compete with the community,
                and track your accuracy over time.
              </li>
              <li>
                <strong>MEDALS Token:</strong> Earn MEDALS for quality contributions. Stake your
                tokens to climb the leaderboard and unlock rewards within the SPORTSBLOCK ecosystem.
              </li>
              <li>
                <strong>Blockchain Rewards:</strong> Content is published to the Hive blockchain,
                where community upvotes translate into real cryptocurrency rewards.
              </li>
              <li>
                <strong>Easy Onboarding:</strong> Sign up with Google or connect an existing Hive
                wallet — no crypto experience required to get started.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Built on Hive</h2>
            <p className="leading-relaxed text-muted-foreground">
              SPORTSBLOCK is powered by the{' '}
              <a
                href="https://hive.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Hive blockchain
              </a>
              , a fast, feeless, and decentralized network designed for social applications. Hive
              ensures that all content is censorship-resistant, permanently stored, and owned by the
              creator — not a corporation.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              By building on Hive, SPORTSBLOCK benefits from a proven blockchain ecosystem with an
              active community, established wallet infrastructure (Hive Keychain, HiveSigner), and a
              robust reward distribution system.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Our Mission</h2>
            <p className="leading-relaxed text-muted-foreground">
              We believe sports fans deserve a platform where their voice matters and their
              contributions are valued. SPORTSBLOCK is building a community-driven sports ecosystem
              where great content is rewarded, ownership is real, and every fan has a stake in the
              platform they help build.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Contact</h2>
            <p className="leading-relaxed text-muted-foreground">
              Have questions, feedback, or partnership inquiries? We&apos;d love to hear from you.
            </p>
            <ul className="mt-4 list-none space-y-2 pl-0 text-muted-foreground">
              <li>
                <strong>Email:</strong>{' '}
                <a href="mailto:paulblanche21@gmail.com" className="text-primary hover:underline">
                  paulblanche21@gmail.com
                </a>
              </li>
              <li>
                <strong>Platform:</strong>{' '}
                <a href="https://sportsblock.app" className="text-primary hover:underline">
                  sportsblock.app
                </a>
              </li>
              <li>
                <strong>Twitter:</strong>{' '}
                <a
                  href="https://twitter.com/sportsblockinfo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @sportsblockinfo
                </a>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-12 border-t pt-8">
          <div className="flex flex-wrap gap-4">
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
