import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WalletProvider } from '@/contexts/WalletProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { PriceProvider } from '@/contexts/PriceContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ToastProvider } from '@/components/core/Toast';
import { QueryClientProvider } from '@/lib/react-query/QueryClientProvider';
import { ModalProvider } from '@/components/modals/ModalProvider';
import { ServiceWorkerInitializer } from '@/components/initializers/ServiceWorkerInitializer';
import { NodeHealthInitializer } from '@/components/initializers/NodeHealthInitializer';
import { MatchThreadLiveNotifier } from '@/components/initializers/MatchThreadLiveNotifier';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { NavigationProgress } from '@/components/feedback/NavigationProgress';
import { GlobalErrorHandlerInitializer } from '@/components/feedback/GlobalErrorHandlerInitializer';
import { AdSenseScript } from '@/components/ads/AdSenseScript';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://sportsblock.app'),
  title: 'Sportsblock - Where Sports Meets Blockchain',
  description:
    'Share your sports stories, insights, and analysis while earning rewards on the Hive blockchain.',
  keywords: ['sports', 'blogging', 'blockchain', 'hive', 'crypto', 'rewards'],
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
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
        url: '/sportsblock-hero.png',
        width: 1980,
        height: 1080,
        alt: 'Sportsblock - Where Sports Meets Blockchain',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sportsblock - Where Sports Meets Blockchain',
    description:
      'Share your sports stories, insights, and analysis while earning rewards on the Hive blockchain.',
    images: ['/sportsblock-hero.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
                  logo: 'https://sportsblock.app/sportsblock512.png',
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
      <body className={inter.className}>
        <ErrorBoundary>
          <QueryClientProvider>
            <ThemeProvider>
              <WalletProvider>
                <AuthProvider>
                  <NotificationProvider>
                    <PriceProvider>
                      <ToastProvider>
                        <ModalProvider>
                          <GlobalErrorHandlerInitializer />
                          <NavigationProgress />
                          <ServiceWorkerInitializer />
                          <NodeHealthInitializer />
                          <MatchThreadLiveNotifier />
                          {children}
                        </ModalProvider>
                      </ToastProvider>
                    </PriceProvider>
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
