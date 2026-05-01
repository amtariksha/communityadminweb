'use client';

import { type ReactNode, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth';

// QA Round 14 #14-2d — wrong-app screen.
//
// Reached when a user signs in successfully but `accessible_apps[]`
// from the verify-otp response does not include `'admin'`. The login
// handler appends each OTHER app the user CAN access as a `?app=`
// query param so this screen can render specific copy ("use the
// resident app" / "use the guard app" / both).
//
// The Log out button drops the in-memory access token + clears the
// httpOnly refresh cookie via POST /auth/logout, then sends the
// user back to /login.

const APP_LABELS: Record<string, string> = {
  resident: 'Resident',
  guard: 'Guard',
};

function joinHumanList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, or ${items[items.length - 1]}`;
}

export default function WrongAppContent(): ReactNode {
  const searchParams = useSearchParams();
  const accessibleApps = useMemo(
    () =>
      searchParams
        .getAll('app')
        .filter((app) => app === 'resident' || app === 'guard'),
    [searchParams],
  );

  const otherAppsLabel =
    accessibleApps.length > 0
      ? joinHumanList(
          accessibleApps.map((a) => `Eassy ${APP_LABELS[a] ?? a}`),
        )
      : null;

  function handleLogout(): void {
    // logout() drops localStorage + cookies + redirects to /login.
    // Reason flag is 'manual' so the next login screen doesn't show
    // a "session expired" toast (which would be misleading here).
    logout({ reason: 'manual' });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle>Only administrators can log in here</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-center text-sm text-muted-foreground">
            {otherAppsLabel ? (
              <>
                This account is registered for the {otherAppsLabel} app.
                Please use that app instead.
              </>
            ) : (
              <>
                This account is not registered for the admin web. Ask
                your society admin to add you with an administrative
                role.
              </>
            )}
          </p>

          {accessibleApps.length > 0 && (
            <div className="space-y-2 rounded-md border bg-background/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Where to find the right app
              </p>
              {accessibleApps.includes('resident') && (
                <p>
                  <strong>Eassy Resident</strong> — Google Play / App
                  Store. Search &ldquo;Eassy Society&rdquo;.
                </p>
              )}
              {accessibleApps.includes('guard') && (
                <p>
                  <strong>Eassy Guard</strong> — provided by your
                  society&rsquo;s administrator. Contact them for the
                  install link.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="w-full sm:w-auto"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Need help?{' '}
            <a
              href="mailto:support@eassy.life"
              className="underline hover:text-foreground"
            >
              support@eassy.life
            </a>{' '}
            ·{' '}
            <Link
              href="/legal/privacy"
              className="underline hover:text-foreground"
            >
              Privacy
            </Link>{' '}
            ·{' '}
            <Link
              href="/legal/terms"
              className="underline hover:text-foreground"
            >
              Terms
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
