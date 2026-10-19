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

/**
 * Society Profile › Location (PROF-S3) over today's data: the society's
 * name and address as stored. Editing, pin code, phone and the map point
 * arrive with PROF-20; until then the platform team changes them.
 */
export default function Page(): ReactNode {
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
        <p className="text-xs text-muted-foreground">
          The committee will be able to edit the address, pin code, phone and map location here soon.
        </p>
      </CardContent>
    </Card>
  );
}
