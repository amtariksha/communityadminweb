'use client';

import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmergencyContacts } from '@/hooks';
import { currentRole } from '@/lib/current-role';
import { EmergencyGrid } from './emergency-grid';

// directory.controller.ts: emergency numbers are written by these roles.
const WRITE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member']);

// Society Profile › Emergency Contacts (PROF-S6, PROF-10).
export default function Page(): ReactNode {
  const query = useEmergencyContacts();
  const readOnly = !WRITE_ROLES.has(currentRole() ?? '');

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm text-muted-foreground">
          Residents see these numbers in the resident app and resident web; guards see them in the guard app.
        </p>
        {query.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : query.error ? (
          <p role="alert" className="text-sm text-destructive">
            The numbers could not be loaded. Reload the page to try again.
          </p>
        ) : (
          <EmergencyGrid key={query.dataUpdatedAt} contacts={query.data ?? []} readOnly={readOnly} />
        )}
      </CardContent>
    </Card>
  );
}
