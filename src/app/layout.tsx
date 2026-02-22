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
  title: 'Sportsblock - Where Sports Meets Blockchain',
  description:
    'Share your sports stories, insights, and analysis while earning rewards on the Hive blockchain.',
  keywords: ['sports', 'blogging', 'blockchain', 'hive', 'crypto', 'rewards'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <AdSenseScript />
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
