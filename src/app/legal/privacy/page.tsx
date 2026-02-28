import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const revalidate = 86400;

export default function PrivacyPolicyPage() {
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

        <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: February 2025</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Introduction</h2>
            <p className="leading-relaxed text-muted-foreground">
              SPORTSBLOCK (&quot;we,&quot; &quot;our,&quot; or &quot;the Platform&quot;) respects
              your privacy and is committed to protecting your personal data. This Privacy Policy
              explains how we collect, use, and safeguard information when you use our Platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Blockchain Public Data</h2>
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm font-medium text-primary">Important Notice</p>
            </div>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              SPORTSBLOCK operates on the Hive blockchain. By using this Platform, you understand
              that:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Public Blockchain:</strong> All content, transactions, votes, and
                interactions published through our Platform are recorded on the public Hive
                blockchain and are permanently visible to anyone.
              </li>
              <li>
                <strong>Immutable Records:</strong> Blockchain data cannot be deleted or modified.
                Your posts, comments, and voting history are permanent public records.
              </li>
              <li>
                <strong>Wallet Addresses:</strong> Your Hive username and wallet address are
                publicly visible and linked to all your on-chain activity.
              </li>
              <li>
                <strong>No Anonymity:</strong> Do not assume privacy for any content or transactions
                made through the blockchain.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Information We Collect</h2>
            <h3 className="mb-2 mt-4 text-lg font-medium">Information You Provide</h3>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Email address (for email authentication users only)</li>
              <li>Profile information you choose to display</li>
              <li>Content you create, publish, or interact with</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-medium">Automatically Collected Information</h3>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Device information (browser type, operating system)</li>
              <li>IP address and approximate location</li>
              <li>Usage data (pages visited, features used)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-medium">Blockchain Data</h3>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Hive username and public keys</li>
              <li>Transaction history and wallet balances (publicly available)</li>
              <li>Published content and voting activity</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. How We Use Your Information</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>To provide and maintain the Platform</li>
              <li>To authenticate your identity</li>
              <li>To display your content and activity</li>
              <li>To improve user experience and Platform features</li>
              <li>To communicate with you about Platform updates</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Third-Party Services</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              We integrate with third-party services that have their own privacy practices:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Hive Blockchain:</strong> Decentralized network with public data visibility
              </li>
              <li>
                <strong>Google:</strong> OAuth authentication and AdSense advertising services
              </li>
              <li>
                <strong>Hive Keychain / HiveSigner / HiveAuth:</strong> Wallet authentication
                providers
              </li>
              <li>
                <strong>External APIs:</strong> Sports data and cryptocurrency price feeds
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We encourage you to review the privacy policies of these third-party services.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Data Security</h2>
            <p className="leading-relaxed text-muted-foreground">
              We implement appropriate technical and organizational measures to protect your data.
              However, no method of transmission over the internet is 100% secure. We cannot
              guarantee absolute security. You are responsible for maintaining the security of your
              Hive private keys and wallet credentials.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Data Retention</h2>
            <p className="leading-relaxed text-muted-foreground">
              We retain your information for as long as your account is active or as needed to
              provide services. Note that blockchain data is permanent and cannot be deleted. For
              off-chain data, we may retain certain information as required by law or legitimate
              business purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Your Rights</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              Depending on your jurisdiction, you may have rights to:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to blockchain limitations)</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability</li>
              <li>Withdraw consent where applicable</li>
            </ul>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              <strong>Note:</strong> We cannot delete, modify, or restrict access to data stored on
              the public Hive blockchain.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">9. Cookies</h2>
            <p className="leading-relaxed text-muted-foreground">
              We use cookies and similar technologies for authentication, preferences, analytics,
              and advertising. We use Google AdSense to display ads, which may set cookies for ad
              personalization and performance measurement. Essential cookies are required for
              Platform functionality. You can manage cookie preferences through your browser
              settings, though this may affect Platform functionality. For full details, see our{' '}
              <Link href="/legal/cookies" className="text-primary hover:underline">
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">10. Children&apos;s Privacy</h2>
            <p className="leading-relaxed text-muted-foreground">
              The Platform is not intended for users under 18 years of age. We do not knowingly
              collect personal information from children. If you believe a child has provided us
              with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">11. International Transfers</h2>
            <p className="leading-relaxed text-muted-foreground">
              Your information may be transferred to and processed in countries other than your own.
              The Hive blockchain is a global decentralized network, and data is replicated across
              nodes worldwide.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">12. Changes to This Policy</h2>
            <p className="leading-relaxed text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting the new policy on the Platform. Your continued use after changes
              constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">13. Contact Us</h2>
            <p className="leading-relaxed text-muted-foreground">
              For privacy-related questions or to exercise your rights, please contact us through
              our official Hive community channels or reach out via the Platform.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t pt-8">
          <p className="text-sm text-muted-foreground">
            By using SPORTSBLOCK, you acknowledge that you have read and understood this Privacy
            Policy.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href="/legal/terms" className="text-sm text-primary hover:underline">
              Terms of Service
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
            <Link href="/legal/dmca" className="text-sm text-primary hover:underline">
              DMCA Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
