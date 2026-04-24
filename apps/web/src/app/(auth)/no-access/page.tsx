'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { ShieldX, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth';

function NoAccessBody(): ReactNode {
  const params = useSearchParams();
  const reason = params.get('reason'); // 'resident' | 'none' | null

  // Resident-only accounts belong on the Flutter app. We explain that
  // here — the admin panel intentionally hides itself from residents so
  // they don't get 403 errors on every module they click.
  if (reason === 'resident') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Use the Resident App</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              Your account is registered as a resident. The resident
              features — raising tickets, paying dues, viewing gate
              passes, voting on resolutions — live in the Eassy Society
              resident app.
            </span>
            <span className="block text-xs">
              Please contact your community admin if you believe you should
              also have admin access (e.g. committee member, accountant).
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => logout()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default / reason='none' — user isn't linked to any society.
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle className="text-xl">No Community Found</CardTitle>
        <CardDescription>
          Your account is not associated with any community. Please contact your
          society administrator to get added.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full" onClick={() => logout()}>
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}

export default function NoAccessPage(): ReactNode {
  // useSearchParams requires a Suspense boundary at the page level for
  // Next.js App Router.
  return (
    <Suspense fallback={null}>
      <NoAccessBody />
    </Suspense>
  );
}
