'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CookiePolicyPage() {
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

        <h1 className="mb-2 text-3xl font-bold">Cookie Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: January 2025</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. What Are Cookies</h2>
            <p className="leading-relaxed text-muted-foreground">
              Cookies are small text files stored on your device when you visit a website. They help
              websites remember your preferences, keep you logged in, and understand how you use the
              site. SPORTSBLOCK uses cookies and similar technologies to provide, protect, and
              improve our Platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Types of Cookies We Use</h2>

            <h3 className="mb-2 mt-4 text-lg font-medium">Essential Cookies</h3>
            <p className="mb-2 leading-relaxed text-muted-foreground">
              These cookies are necessary for the Platform to function and cannot be disabled.
            </p>
            <div className="mb-4 overflow-hidden rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Cookie</th>
                    <th className="p-3 text-left font-medium">Purpose</th>
                    <th className="p-3 text-left font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t">
                    <td className="p-3 font-mono text-xs">auth_session</td>
                    <td className="p-3">Maintains your login session</td>
                    <td className="p-3">Session</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3 font-mono text-xs">firebase_auth</td>
                    <td className="p-3">Firebase authentication state</td>
                    <td className="p-3">Persistent</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3 font-mono text-xs">theme</td>
                    <td className="p-3">Stores your light/dark mode preference</td>
                    <td className="p-3">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mb-2 mt-4 text-lg font-medium">Functional Cookies</h3>
            <p className="mb-2 leading-relaxed text-muted-foreground">
              These cookies enable enhanced functionality and personalization.
            </p>
            <div className="mb-4 overflow-hidden rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Cookie</th>
                    <th className="p-3 text-left font-medium">Purpose</th>
                    <th className="p-3 text-left font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t">
                    <td className="p-3 font-mono text-xs">user_preferences</td>
                    <td className="p-3">Stores UI preferences and settings</td>
                    <td className="p-3">1 year</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3 font-mono text-xs">recent_communities</td>
                    <td className="p-3">Tracks recently visited communities</td>
                    <td className="p-3">30 days</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mb-2 mt-4 text-lg font-medium">Analytics Cookies</h3>
            <p className="mb-2 leading-relaxed text-muted-foreground">
              These cookies help us understand how visitors interact with our Platform.
            </p>
            <div className="mb-4 overflow-hidden rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Cookie</th>
                    <th className="p-3 text-left font-medium">Purpose</th>
                    <th className="p-3 text-left font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t">
                    <td className="p-3 font-mono text-xs">_ga, _gid</td>
                    <td className="p-3">Google Analytics - tracks page views and user behavior</td>
                    <td className="p-3">2 years / 24 hours</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3 font-mono text-xs">_vercel_insights</td>
                    <td className="p-3">Vercel Analytics - performance monitoring</td>
                    <td className="p-3">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Local Storage</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              In addition to cookies, we use browser local storage for:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Authentication state:</strong> Hive wallet connection status and user
                session data
              </li>
              <li>
                <strong>Draft posts:</strong> Automatically saved drafts of content you&apos;re
                writing
              </li>
              <li>
                <strong>Bookmarks:</strong> Locally stored bookmarked posts for quick access
              </li>
              <li>
                <strong>Cache data:</strong> Temporary storage of API responses for faster loading
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Third-Party Cookies</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              Some cookies are placed by third-party services that appear on our pages:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Firebase (Google):</strong> Authentication and analytics services
              </li>
              <li>
                <strong>Vercel:</strong> Hosting and performance analytics
              </li>
              <li>
                <strong>Embedded content:</strong> Videos or social media embeds may set their own
                cookies
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We do not control third-party cookies. Please review their respective privacy
              policies.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Managing Cookies</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              You can control cookies through your browser settings:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Chrome:</strong> Settings → Privacy and Security → Cookies
              </li>
              <li>
                <strong>Firefox:</strong> Settings → Privacy & Security → Cookies
              </li>
              <li>
                <strong>Safari:</strong> Preferences → Privacy → Cookies
              </li>
              <li>
                <strong>Edge:</strong> Settings → Privacy → Cookies
              </li>
            </ul>
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm text-primary">
                <strong>Note:</strong> Disabling essential cookies will prevent you from logging in
                and using core Platform features.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Do Not Track</h2>
            <p className="leading-relaxed text-muted-foreground">
              Some browsers have a &quot;Do Not Track&quot; feature that signals to websites that
              you do not want to be tracked. We currently do not respond to DNT signals, but you can
              manage tracking through cookie settings and browser extensions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Updates to This Policy</h2>
            <p className="leading-relaxed text-muted-foreground">
              We may update this Cookie Policy to reflect changes in our practices or for legal
              reasons. We will post any changes on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Contact Us</h2>
            <p className="leading-relaxed text-muted-foreground">
              If you have questions about our use of cookies, please contact us through our official
              community channels.
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
