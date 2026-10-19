'use client';

import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenant } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';

function Row({ label, value }: { label: string; value: string | null | undefined }): ReactNode {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}

/** The address as stored, read-only: shown while the API has no profile route yet. */
export function StoredAddress(): ReactNode {
  const tenant = useTenant(getCurrentTenant() ?? '');
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h3 className="font-semibold">Society Address</h3>
        {tenant.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <dl>
            <Row label="Society Name" value={tenant.data?.name} />
            <Row label="Address" value={tenant.data?.address} />
            <Row label="City" value={tenant.data?.city} />
            <Row label="State" value={tenant.data?.state} />
          </dl>
        )}
        <p className="text-xs text-muted-foreground">Editing the society location is not available yet.</p>
      </CardContent>
    </Card>
  );
}
