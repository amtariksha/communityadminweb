'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getToken, logout, purgeLegacyTokenStorage } from '@/lib/auth';
import { refreshAccessToken } from '@/lib/api';
import { BRAND } from '@/config/branding';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps): ReactNode {
  const router = useRouter();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // QA #57 — mirror the dashboard layout's bootstrap. The in-memory
    // access token is null on any tab reload; try the httpOnly refresh
    // cookie before sending the super-admin to /login.
    purgeLegacyTokenStorage();

    async function bootstrap(): Promise<void> {
      if (!getToken()) {
        const outcome = await refreshAccessToken();
        if (cancelled) return;
        if (outcome.kind === 'auth_failed') {
          router.replace('/login');
          return;
        }
        if (outcome.kind === 'transient') {
          // QA #28 — don't bounce a still-authenticated user to /login
          // just because /auth/refresh had a network blip.
          setBootstrapError(
            'Could not reach the server. Check your connection and try again.',
          );
          return;
        }
      }
      if (!cancelled) setBootstrapped(true);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (bootstrapError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-4 rounded-lg border bg-card p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold">Connection issue</h2>
          <p className="text-sm text-muted-foreground">{bootstrapError}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-logo-accent">
              <span className="text-sm font-bold text-white">{BRAND.logoLetter}</span>
            </div>
            <span className="text-lg font-bold">{BRAND.appName} — Super Admin</span>
          </div>
          {/*
            The "Back to Dashboard" shortcut was removed — super-admins
            are platform operators, not per-tenant admins. A stray click
            took them into the wrong tenant's dashboard and lost the
            super-admin context. Replaced with Sign Out, which is what
            they actually want at the end of a session.
          */}
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 lg:p-6">{children}</main>
    </div>
  );
}
