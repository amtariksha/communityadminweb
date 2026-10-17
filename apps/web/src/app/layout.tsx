import type { Metadata } from 'next';
import { Inter, Roboto } from 'next/font/google';
import { type ReactNode } from 'react';
import { QueryProvider, QueryToastBridge } from '@/lib/query-provider';
import { ThemeProvider } from '@/lib/theme-provider';
import { HelpModeProvider } from '@/lib/help-mode-context';
import { ToastProvider } from '@/components/ui/toast';
import { prePaintLayoutScript } from '@/lib/admin-layout';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// The classic layout's type (SB-14). Not preloaded: only societies on the
// classic layout use it, and the browser fetches it on first use.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  preload: false,
});

export const metadata: Metadata = {
  title: 'Mera Ghar',
  description: 'Society Management Platform',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Marks <html data-layout> from the society's stored layout before
            first paint, so a classic society never sees the standard look
            flash first (SB-01). Built from constants only. */}
        <script dangerouslySetInnerHTML={{ __html: prePaintLayoutScript() }} />
      </head>
      <body className={`${inter.variable} ${roboto.variable} font-sans antialiased`}>
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
