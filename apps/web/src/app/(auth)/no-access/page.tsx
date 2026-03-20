'use client';

import { type ReactNode } from 'react';
import { ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth';

export default function NoAccessPage(): ReactNode {
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
        <Button variant="outline" className="w-full" onClick={logout}>
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
