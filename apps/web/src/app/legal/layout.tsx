import Link from 'next/link';
import type { ReactNode } from 'react';
import { BRAND } from '@/config/branding';

// QA Round 14 #14-2c — public /legal/* routes don't need auth or
// tenant chrome. Keep the layout minimal so the page reads like a
// document, not an app screen. Anyone with a link (residents,
// guards, prospective tenants, our compliance/support team) can
// open these without a login state.

interface LegalLayoutProps {
  children: ReactNode;
}

export default function LegalLayout({ children }: LegalLayoutProps): ReactNode {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-logo-accent">
            <span className="text-base font-bold text-white">{BRAND.logoLetter}</span>
          </div>
          <Link href="/" className="text-base font-semibold">
            {BRAND.appName}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
          <span>© {BRAND.legalEntity} — {BRAND.tagline}</span>
          <div className="flex items-center gap-4">
            <Link href="/legal/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
