'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnitPanel, type UnitPanel as UnitPanelData } from '@/hooks/use-unit-panel';
import { ApiError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { PanelDocuments } from './panel-documents';
import { PanelFamily } from './panel-family';
import { PanelMembers } from './panel-members';
import { PanelStaff } from './panel-staff';
import { PanelVehicles } from './panel-vehicles';
import { APPROVED_USERS_ROUTE, blockUnitLabel } from './unit-labels';

function PanelError({ error }: { error: unknown }): ReactNode {
  if (error instanceof ApiError && error.code === 'unit_not_found') {
    return (
      <div className="space-y-2">
        <p className="text-sm">Unit not found.</p>
        <Link href={APPROVED_USERS_ROUTE} className="text-sm text-primary hover:underline">
          Back to Approved Users
        </Link>
      </div>
    );
  }
  if (isNotDeployed(error)) {
    return <p className="text-sm text-muted-foreground">The unit panel is not available yet on this server.</p>;
  }
  if (error instanceof ApiError && error.status === 403) {
    return <p className="text-sm text-muted-foreground">You cannot view this unit.</p>;
  }
  return (
    <p role="alert" className="text-sm text-destructive">
      The unit could not be loaded. Reload the page to try again.
    </p>
  );
}

function PanelHeader({ panel }: { panel: UnitPanelData }): ReactNode {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-base font-semibold">Unit: {blockUnitLabel(panel.unit)}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <ShowLogsButton recordTypes={['unit']} recordId={panel.unit.id} />
        {/* Today's unit dialog, until UNIT-16 gives the form a page of its own. */}
        <Link
          href={`/units?unit=${panel.unit.id}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          data-slot="button"
          data-size="sm"
        >
          View/Edit Unit details
        </Link>
      </div>
    </div>
  );
}

/** The right-hand side of Approved Users (UNIT-S5): one unit, every section with its count. */
export function UnitPanel({ unitId }: { unitId: string }): ReactNode {
  const query = useUnitPanel(unitId);
  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (query.isError || !query.data) return <PanelError error={query.error} />;
  const panel = query.data;
  return (
    <div className="space-y-3">
      <PanelHeader panel={panel} />
      <PanelMembers members={panel.members} count={panel.counts.members} />
      <PanelVehicles vehicles={panel.vehicles} count={panel.counts.vehicles} />
      <PanelStaff staff={panel.staff} count={panel.counts.staff} />
      <PanelDocuments documents={panel.documents} count={panel.counts.documents} />
      <PanelFamily family={panel.family} count={panel.counts.family} />
    </div>
  );
}
