import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AiohaProvider } from "@/contexts/AiohaProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { PriceProvider } from "@/contexts/PriceContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ToastProvider } from "@/components/ui/Toast";
import { QueryClientProvider } from "@/lib/react-query/QueryClientProvider";
import { ModalProvider } from "@/components/modals/ModalProvider";
import { ServiceWorkerInitializer } from "@/components/ServiceWorkerInitializer";
import { NodeHealthInitializer } from "@/components/NodeHealthInitializer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NavigationProgress } from "@/components/NavigationProgress";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sportsblock - Where Sports Meets Blockchain",
  description: "Share your sports stories, insights, and analysis while earning rewards on the Hive blockchain.",
  keywords: ["sports", "blogging", "blockchain", "hive", "crypto", "rewards"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider>
          <ThemeProvider>
            <AiohaProvider>
              <AuthProvider>
                <NotificationProvider>
                  <PriceProvider>
                    <ToastProvider>
                      <ModalProvider>
                        <ErrorBoundary>
                          <NavigationProgress />
                          <ServiceWorkerInitializer />
                          <NodeHealthInitializer />
                          {children}
                        </ErrorBoundary>
                      </ModalProvider>
                    </ToastProvider>
                  </PriceProvider>
                </NotificationProvider>
              </AuthProvider>
            </AiohaProvider>
          </ThemeProvider>
        </QueryClientProvider>
        <Analytics />
      </body>
    </html>
  );
}