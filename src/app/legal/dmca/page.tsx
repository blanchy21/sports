'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function DMCAPolicyPage() {
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

        <h1 className="mb-2 text-3xl font-bold">DMCA & Copyright Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: January 2025</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Overview</h2>
            <p className="leading-relaxed text-muted-foreground">
              SPORTSBLOCK respects the intellectual property rights of others and expects users to
              do the same. In accordance with the Digital Millennium Copyright Act of 1998
              (&quot;DMCA&quot;), we will respond to notices of alleged copyright infringement that
              comply with the DMCA and are properly submitted to us.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Important Blockchain Notice</h2>
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">Critical Information</p>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              Content on SPORTSBLOCK is published to the Hive blockchain, a decentralized and
              immutable public ledger.{' '}
              <strong>We cannot delete, modify, or remove content from the blockchain.</strong> Upon
              receiving a valid DMCA notice, we can only:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Hide the infringing content from the SPORTSBLOCK platform interface</li>
              <li>Notify the user who posted the content</li>
              <li>Take action against repeat infringers on our platform</li>
            </ul>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The content will remain accessible on the Hive blockchain and may be visible through
              other interfaces or applications that access the blockchain.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Filing a DMCA Notice</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              If you believe your copyrighted work has been copied in a way that constitutes
              copyright infringement, please provide a written notification containing:
            </p>
            <ol className="list-decimal space-y-3 pl-6 text-muted-foreground">
              <li>
                <strong>Physical or electronic signature</strong> of the copyright owner or
                authorized agent
              </li>
              <li>
                <strong>Identification of the copyrighted work</strong> claimed to have been
                infringed, or a representative list if multiple works are covered
              </li>
              <li>
                <strong>Identification of the material</strong> claimed to be infringing, including
                the specific URL(s) or sufficient information to locate the content
              </li>
              <li>
                <strong>Your contact information:</strong> name, address, telephone number, and
                email address
              </li>
              <li>
                <strong>A statement</strong> that you have a good faith belief that the disputed use
                is not authorized by the copyright owner, its agent, or the law
              </li>
              <li>
                <strong>A statement</strong> that the information in your notice is accurate, and
                under penalty of perjury, that you are authorized to act on behalf of the copyright
                owner
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Counter-Notification</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              If you believe your content was removed or hidden in error, you may submit a
              counter-notification containing:
            </p>
            <ol className="list-decimal space-y-3 pl-6 text-muted-foreground">
              <li>
                <strong>Your physical or electronic signature</strong>
              </li>
              <li>
                <strong>Identification of the material</strong> that was removed or hidden and the
                location where it appeared before removal
              </li>
              <li>
                <strong>A statement under penalty of perjury</strong> that you have a good faith
                belief the material was removed or hidden as a result of mistake or
                misidentification
              </li>
              <li>
                <strong>Your name, address, and telephone number</strong>
              </li>
              <li>
                <strong>A statement</strong> that you consent to the jurisdiction of the federal
                court in your district, and that you will accept service of process from the
                complainant
              </li>
            </ol>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Upon receiving a valid counter-notification, we may restore the content&apos;s
              visibility on our platform within 10-14 business days, unless the original complainant
              notifies us of legal action.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Repeat Infringer Policy</h2>
            <p className="leading-relaxed text-muted-foreground">
              We maintain a policy of terminating, in appropriate circumstances, users who are
              deemed repeat infringers. Users who repeatedly post infringing content may have their
              content permanently hidden from our platform and may be reported to the Hive community
              for further action.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Fair Use</h2>
            <p className="leading-relaxed text-muted-foreground">
              Before submitting a DMCA notice, please consider whether the use may constitute fair
              use. Fair use factors include: the purpose of the use, the nature of the copyrighted
              work, the amount used, and the effect on the market for the original work. Sports
              commentary, criticism, and news reporting often qualify for fair use protection.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Misrepresentation Warning</h2>
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm text-muted-foreground">
                Under Section 512(f) of the DMCA, any person who knowingly materially misrepresents
                that material is infringing, or that it was removed by mistake, may be subject to
                liability for damages, including costs and attorneys&apos; fees.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Contact Information</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              Send DMCA notices and counter-notifications to our designated agent:
            </p>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                <strong>DMCA Agent</strong>
                <br />
                SPORTSBLOCK
                <br />
                Email: dmca@sportsblock.io
                <br />
                <br />
                Please include &quot;DMCA Notice&quot; or &quot;DMCA Counter-Notification&quot; in
                the subject line.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">9. Modifications</h2>
            <p className="leading-relaxed text-muted-foreground">
              We reserve the right to modify this DMCA Policy at any time. Changes will be posted on
              this page with an updated revision date.
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
