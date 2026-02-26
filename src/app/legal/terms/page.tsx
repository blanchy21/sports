import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const revalidate = 86400; // Revalidate once per day

export default function TermsOfServicePage() {
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

        <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: January 2025</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="leading-relaxed text-muted-foreground">
              By accessing or using SPORTSBLOCK (&quot;the Platform&quot;), you agree to be bound by
              these Terms of Service. If you do not agree to these terms, do not use the Platform.
              These terms constitute a legally binding agreement between you and SPORTSBLOCK.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Platform Description</h2>
            <p className="leading-relaxed text-muted-foreground">
              SPORTSBLOCK is a sports content platform integrated with the Hive blockchain. The
              Platform allows users to read, publish, and interact with sports-related content.
              Content is published to and stored on the Hive blockchain, which operates
              independently of SPORTSBLOCK.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Cryptocurrency & Token Disclaimer</h2>
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">Important Risk Warning</p>
            </div>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              The Platform interacts with HIVE and HBD tokens on the Hive blockchain. By using this
              Platform, you acknowledge and agree that:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>No Investment Advice:</strong> SPORTSBLOCK does not provide investment,
                financial, tax, or legal advice. Nothing on this Platform should be construed as a
                recommendation to buy, sell, or hold any cryptocurrency or digital asset.
              </li>
              <li>
                <strong>Purchase at Your Own Risk:</strong> Any acquisition, holding, or use of
                HIVE, HBD, or other digital assets is entirely at your own risk. Cryptocurrency
                values are highly volatile and may fluctuate significantly. You may lose some or all
                of your investment.
              </li>
              <li>
                <strong>No Guarantees:</strong> We make no guarantees regarding the value,
                stability, or future availability of any tokens or rewards earned through the
                Platform.
              </li>
              <li>
                <strong>Regulatory Uncertainty:</strong> Cryptocurrency regulations vary by
                jurisdiction and are subject to change. You are solely responsible for compliance
                with applicable laws in your jurisdiction.
              </li>
              <li>
                <strong>Irreversible Transactions:</strong> Blockchain transactions are
                irreversible. SPORTSBLOCK cannot recover lost, stolen, or mistakenly sent tokens.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. User Responsibilities</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">You agree to:</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Maintain the security of your Hive wallet and private keys</li>
              <li>Be solely responsible for all activity under your account</li>
              <li>Not use the Platform for money laundering, fraud, or illegal activities</li>
              <li>Comply with all applicable anti-money laundering (AML) regulations</li>
              <li>Conduct your own research before making any financial decisions</li>
              <li>Not post content that infringes intellectual property rights</li>
              <li>Not engage in market manipulation or deceptive practices</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Blockchain Immutability</h2>
            <p className="leading-relaxed text-muted-foreground">
              Content published through SPORTSBLOCK is stored on the Hive blockchain. Once
              published, content
              <strong> cannot be fully deleted</strong> due to the immutable nature of blockchain
              technology. While we may hide content from our Platform interface, the underlying
              blockchain record will persist. Consider this carefully before publishing.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Third-Party Services</h2>
            <p className="leading-relaxed text-muted-foreground">
              The Platform integrates with third-party services including but not limited to: Hive
              blockchain, Hive Keychain, HiveSigner, and HiveAuth. We are not responsible for the
              operation, availability, or security of these third-party services. Your use of such
              services is subject to their respective terms and conditions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Rewards and Monetization</h2>
            <p className="leading-relaxed text-muted-foreground">
              Content rewards are determined by the Hive blockchain&apos;s reward pool and community
              voting mechanisms, not by SPORTSBLOCK. We do not guarantee any minimum rewards or
              earnings. Reward distribution is subject to Hive&apos;s protocol rules and may change
              without notice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Limitation of Liability</h2>
            <p className="leading-relaxed text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SPORTSBLOCK AND ITS AFFILIATES SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR TOKENS, ARISING FROM YOUR USE
              OF THE PLATFORM. THIS INCLUDES ANY DAMAGES RESULTING FROM SECURITY BREACHES,
              BLOCKCHAIN FORKS, SMART CONTRACT FAILURES, OR TOKEN VALUE FLUCTUATIONS.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">9. Disclaimer of Warranties</h2>
            <p className="leading-relaxed text-muted-foreground">
              THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
              WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES
              INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE
              DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">10. Indemnification</h2>
            <p className="leading-relaxed text-muted-foreground">
              You agree to indemnify and hold harmless SPORTSBLOCK and its affiliates from any
              claims, damages, losses, or expenses arising from your use of the Platform, violation
              of these terms, or infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">11. Modifications</h2>
            <p className="leading-relaxed text-muted-foreground">
              We reserve the right to modify these terms at any time. Changes will be effective upon
              posting to the Platform. Your continued use of the Platform after changes constitutes
              acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">12. Governing Law</h2>
            <p className="leading-relaxed text-muted-foreground">
              These terms shall be governed by and construed in accordance with applicable laws,
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">13. Contact</h2>
            <p className="leading-relaxed text-muted-foreground">
              For questions about these Terms of Service, please contact us through the Hive
              blockchain community or our official communication channels.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t pt-8">
          <p className="text-sm text-muted-foreground">
            By using SPORTSBLOCK, you acknowledge that you have read, understood, and agree to these
            Terms of Service.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
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
            <Link href="/legal/dmca" className="text-sm text-primary hover:underline">
              DMCA Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
