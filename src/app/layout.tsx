import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WalletProvider } from '@/contexts/WalletProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ToastProvider } from '@/components/core/Toast';
import { QueryClientProvider } from '@/lib/react-query/QueryClientProvider';
import { ModalProvider } from '@/components/modals/ModalProvider';
import { LazyInitializers } from '@/components/initializers/LazyInitializers';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { NavigationProgress } from '@/components/feedback/NavigationProgress';
import { AdSenseScript } from '@/components/ads/AdSenseScript';

const displayFont = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const bodyFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://sportsblock.app'),
  alternates: {
    canonical: './',
  },
  title: 'Sportsblock - Where Sports Meets Blockchain',
  description:
    'Share your sports stories, insights, and analysis while earning rewards on the Hive blockchain.',
  keywords: ['sports', 'blogging', 'blockchain', 'hive', 'crypto', 'rewards'],
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.svg',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Sportsblock - Where Sports Meets Blockchain',
    description:
      'Share your sports stories, insights, and analysis while earning rewards on the Hive blockchain.',
    siteName: 'Sportsblock',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/x-card-image.png',
        width: 1200,
        height: 630,
        alt: 'Sportsblock - Where Sports Meets Blockchain',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sportsblock - Cut Out The Noise. Earn.',
    description:
      'Your sports knowledge has real value. Write about the game you love and earn crypto rewards on the Hive blockchain.',
    images: ['/x-card-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <head>
        <link
          rel="preconnect"
          href="https://pagead2.googlesyndication.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://o4510847625003008.ingest.de.sentry.io"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://files.peakd.com" />
        <link rel="dns-prefetch" href="https://images.hive.blog" />
        <link rel="dns-prefetch" href="https://cdn.steemitimages.com" />
        <AdSenseScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  name: 'Sportsblock',
                  url: 'https://sportsblock.app',
                  logo: 'https://sportsblock.app/favicon.svg',
                },
                {
                  '@type': 'WebSite',
                  name: 'Sportsblock',
                  url: 'https://sportsblock.app',
                  description:
                    'Share your sports stories, insights, and analysis while earning rewards on the Hive blockchain.',
                },
              ],
            }),
          }}
        />
      </head>
      <body className={bodyFont.className}>
        <ErrorBoundary>
          <QueryClientProvider>
            <ThemeProvider>
              <WalletProvider>
                <AuthProvider>
                  <NotificationProvider>
                    <ToastProvider>
                      <ModalProvider>
                        <NavigationProgress />
                        <LazyInitializers />
                        {children}
                      </ModalProvider>
                    </ToastProvider>
                  </NotificationProvider>
                </AuthProvider>
              </WalletProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
