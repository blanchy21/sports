import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export const revalidate = 86400;

export default function CommunityGuidelinesPage() {
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

        <h1 className="mb-2 text-3xl font-bold">Community Guidelines</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: January 2025</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <p className="text-base leading-relaxed text-muted-foreground">
              SPORTSBLOCK is a community of sports enthusiasts sharing content on the Hive
              blockchain. These guidelines help maintain a respectful, engaging environment for
              everyone. By using the Platform, you agree to follow these guidelines.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Our Core Values</h2>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <h3 className="font-medium">Quality Content</h3>
                  <p className="text-sm text-muted-foreground">
                    Original, thoughtful sports content that adds value to the community
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <span className="text-2xl">🤝</span>
                <div>
                  <h3 className="font-medium">Respect</h3>
                  <p className="text-sm text-muted-foreground">
                    Treat fellow community members with courtesy, even in disagreement
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <span className="text-2xl">💎</span>
                <div>
                  <h3 className="font-medium">Authenticity</h3>
                  <p className="text-sm text-muted-foreground">
                    Be genuine, credit sources, and avoid misleading content
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Content Guidelines</h2>

            <h3 className="mb-3 mt-4 flex items-center gap-2 text-lg font-medium">
              <CheckCircle className="h-5 w-5 text-success" />
              Encouraged Content
            </h3>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Original sports analysis, opinions, and commentary</li>
              <li>Match previews, recaps, and post-game discussions</li>
              <li>Fantasy sports tips and strategies</li>
              <li>Sports news with your own perspective added</li>
              <li>Fan experiences, game day stories, and community events</li>
              <li>Educational content about sports rules, history, or strategies</li>
              <li>Constructive debates and respectful disagreements</li>
              <li>Properly attributed quotes and statistics</li>
            </ul>

            <h3 className="mb-3 mt-6 flex items-center gap-2 text-lg font-medium">
              <XCircle className="h-5 w-5 text-destructive" />
              Prohibited Content
            </h3>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Spam:</strong> Repetitive posts, excessive self-promotion, or low-effort
                content
              </li>
              <li>
                <strong>Plagiarism:</strong> Copying content without attribution or permission
              </li>
              <li>
                <strong>Harassment:</strong> Personal attacks, bullying, or targeted abuse
              </li>
              <li>
                <strong>Hate speech:</strong> Content attacking individuals or groups based on race,
                ethnicity, religion, gender, sexual orientation, disability, or nationality
              </li>
              <li>
                <strong>Illegal content:</strong> Pirated streams, illegal gambling promotion, or
                content violating laws
              </li>
              <li>
                <strong>Misinformation:</strong> Deliberately false information presented as fact
              </li>
              <li>
                <strong>NSFW content:</strong> Pornographic, excessively violent, or graphic
                material
              </li>
              <li>
                <strong>Doxxing:</strong> Sharing private information about others without consent
              </li>
              <li>
                <strong>Scams:</strong> Phishing, fraudulent schemes, or deceptive financial advice
              </li>
              <li>
                <strong>Vote manipulation:</strong> Coordinated voting schemes or selling votes
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Engagement Guidelines</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Be constructive:</strong> Criticism should be aimed at ideas, not people
              </li>
              <li>
                <strong>Stay on topic:</strong> Keep discussions relevant to sports and the
                community
              </li>
              <li>
                <strong>Engage genuinely:</strong> Don&apos;t comment just to promote your own
                content
              </li>
              <li>
                <strong>Report violations:</strong> Help us maintain community standards by
                reporting inappropriate content
              </li>
              <li>
                <strong>Accept downvotes gracefully:</strong> Not everyone will agree with your
                content, and that&apos;s okay
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Cryptocurrency & Rewards</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Do not beg for upvotes or rewards</li>
              <li>Do not offer to buy or sell votes</li>
              <li>Do not create content solely to farm rewards</li>
              <li>Be transparent about any sponsorships or paid promotions</li>
              <li>Do not give financial advice or guarantee returns</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Intellectual Property</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Only share content you have the right to share</li>
              <li>Credit original creators when sharing or building upon their work</li>
              <li>Use images under fair use or with proper licensing</li>
              <li>Respect team logos, player images, and broadcast footage rights</li>
              <li>Link to sources rather than copying entire articles</li>
            </ul>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              For copyright concerns, see our{' '}
              <Link href="/legal/dmca" className="text-primary hover:underline">
                DMCA Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Enforcement</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              Violations of these guidelines may result in:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Content removal or hiding from the Platform interface</li>
              <li>Warning notifications</li>
              <li>Temporary or permanent muting from the community</li>
              <li>Downvotes from community moderators</li>
              <li>Reporting to Hive community governance</li>
            </ul>
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm text-primary">
                <strong>Note:</strong> Due to blockchain immutability, we cannot delete content from
                the Hive blockchain. We can only hide it from the SPORTSBLOCK interface.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Reporting Violations</h2>
            <p className="leading-relaxed text-muted-foreground">
              If you see content that violates these guidelines, please report it using the report
              feature on posts and comments, or contact our moderation team through official
              community channels. We review all reports and take appropriate action.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Changes to Guidelines</h2>
            <p className="leading-relaxed text-muted-foreground">
              We may update these guidelines as our community evolves. Significant changes will be
              announced through community posts. Your continued use of the Platform constitutes
              acceptance of updated guidelines.
            </p>
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
            <Link href="/legal/dmca" className="text-sm text-primary hover:underline">
              DMCA Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
