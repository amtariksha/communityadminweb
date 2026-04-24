'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getToken, logout, purgeLegacyTokenStorage } from '@/lib/auth';
import { refreshAccessToken } from '@/lib/api';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps): ReactNode {
  const router = useRouter();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // QA #57 — mirror the dashboard layout's bootstrap. The in-memory
    // access token is null on any tab reload; try the httpOnly refresh
    // cookie before sending the super-admin to /login.
    purgeLegacyTokenStorage();

    async function bootstrap(): Promise<void> {
      if (!getToken()) {
        const newToken = await refreshAccessToken();
        if (cancelled) return;
        if (!newToken) {
          router.replace('/login');
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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5A623]">
              <span className="text-sm font-bold text-white">e</span>
            </div>
            <span className="text-lg font-bold">Eassy Society — Super Admin</span>
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
