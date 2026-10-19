'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnitPanel, type UnitPanel as UnitPanelData, type UnitPanelMember } from '@/hooks/use-unit-panel';
import { ApiError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { PanelDocuments } from './panel-documents';
import { PanelFamily } from './panel-family';
import { PanelMembers } from './panel-members';
import { PanelStaff } from './panel-staff';
import { PanelVehicles } from './panel-vehicles';
import { MemberForm } from '../components/member-form';
import { memberFormValues } from '../components/member-form-values';
import { StaffForm } from './staff-form';
import { usePanelActions } from './use-panel-actions';
import { APPROVED_USERS_ROUTE, blockUnitLabel, unitPanelHref } from './unit-labels';

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
  const [addingStaff, setAddingStaff] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-base font-semibold">Unit: {blockUnitLabel(panel.unit)}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <ShowLogsButton recordTypes={['unit']} recordId={panel.unit.id} />
        <Link
          href={`${unitPanelHref(panel.unit.id)}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          data-slot="button"
          data-size="sm"
        >
          View/Edit Unit details
        </Link>
        <Button type="button" variant="outline" size="sm" onClick={() => setAddingStaff(true)}>
          + Create New Staff
        </Button>
      </div>
      {addingStaff && <StaffForm unitId={panel.unit.id} open onClose={() => setAddingStaff(false)} />}
    </div>
  );
}

/** Edit Member as a page in the panel (SB-07 classic), Close back to the sections. */
function MemberEditPage({ panel, member, onDone }: { panel: UnitPanelData; member: UnitPanelMember; onDone: () => void }): ReactNode {
  const actions = usePanelActions(panel.unit.id);
  const otherPrimary = [...panel.members, ...panel.family].find((m) => m.is_primary_contact && m.id !== member.id);
  return (
    <MemberForm
      mode="page"
      initial={memberFormValues(member)}
      otherPrimaryName={otherPrimary?.name ?? null}
      saving={actions.saving}
      onClose={onDone}
      onSave={(changes) => actions.saveMember(member.id, changes, onDone)}
    />
  );
}

function PanelSections({ panel }: { panel: UnitPanelData }): ReactNode {
  const actions = usePanelActions(panel.unit.id);
  const [editing, setEditing] = useState<UnitPanelMember | null>(null);
  if (editing) return <MemberEditPage panel={panel} member={editing} onDone={() => setEditing(null)} />;
  const unitId = panel.unit.id;
  return (
    <>
      <PanelMembers members={panel.members} count={panel.counts.members} unitId={unitId} actions={actions} onEdit={setEditing} />
      <PanelVehicles vehicles={panel.vehicles} count={panel.counts.vehicles} unitId={unitId} />
      <PanelStaff staff={panel.staff} count={panel.counts.staff} unitId={unitId} />
      <PanelDocuments documents={panel.documents} count={panel.counts.documents} unit={panel.unit} />
      <PanelFamily family={panel.family} count={panel.counts.family} unitId={unitId} />
    </>
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
      <PanelSections panel={panel} />
    </div>
  );
}
