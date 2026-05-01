import Link from 'next/link';
import { type ReactNode } from 'react';

// QA Round 14 #14-2c — slim dashboard footer that surfaces the legal
// links residents can otherwise only reach by remembering the URL.
// Sits below `<main>` in the dashboard layout so it doesn't push
// content off the visible viewport on short screens — content scrolls
// independently inside `<main>`, and this footer pins to the bottom
// of the column.

export function Footer(): ReactNode {
  return (
    <footer className="border-t bg-background px-4 py-3 text-xs text-muted-foreground sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>© Eassy Society — Society Management Platform</span>
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
  );
}
