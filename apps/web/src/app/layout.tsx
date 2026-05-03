import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { type ReactNode } from 'react';
import { QueryProvider, QueryToastBridge } from '@/lib/query-provider';
import { ThemeProvider } from '@/lib/theme-provider';
import { HelpModeProvider } from '@/lib/help-mode-context';
import { ToastProvider } from '@/components/ui/toast';
import { BRAND } from '@/config/branding';
import { BrandStyles } from '@/config/branding/brand-styles';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: BRAND.appName,
  description: BRAND.tagline,
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="en" data-brand={BRAND.id} suppressHydrationWarning>
      <head>
        <BrandStyles />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <HelpModeProvider>
            {/* ToastProvider wraps QueryProvider so QueryToastBridge can
                call useToast() inside the React Query tree. Without this
                order, list pages silently failed and the infinite-skeleton
                bug manifested — see lib/query-provider.tsx for context. */}
            <ToastProvider>
              <QueryProvider>
                <QueryToastBridge />
                {children}
              </QueryProvider>
            </ToastProvider>
          </HelpModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
