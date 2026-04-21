'use client';

import { type ReactNode, useState } from 'react';
import { Save, ShieldCheck, Wrench, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useRoleDelegation,
  useUpdateRoleDelegation,
  type ExpiryEnforcement,
  type RoleDelegation,
  type RoleDelegationUpdate,
  type SecuritySupervisorPermissions,
  type FacilitySupervisorPermissions,
} from '@/hooks';

// ---------------------------------------------------------------------------
// Toggle metadata — human labels + grouping for the checkbox grid
// ---------------------------------------------------------------------------

interface ToggleDef {
  key: string;
  label: string;
  help?: string;
}

interface ToggleGroup {
  title: string;
  items: ToggleDef[];
}

const SECURITY_GROUPS: ToggleGroup[] = [
  {
    title: 'Staff',
    items: [
      { key: 'guard_staff_crud', label: 'Create/edit guard staff' },
      {
        key: 'non_guard_staff_crud',
        label: 'Create/edit non-guard staff',
        help: 'Off by default for external security agencies.',
      },
      { key: 'manage_shifts', label: 'Manage shifts (guards)' },
      { key: 'view_attendance', label: 'View attendance reports' },
      {
        key: 'clock_in_override',
        label: 'Clock in/out on behalf of guards',
        help: 'Routed through a community-admin approval before applying.',
      },
      { key: 'leave_approve_own_team', label: 'Approve leave — own team' },
      { key: 'leave_approve_all_staff', label: 'Approve leave — all staff' },
    ],
  },
  {
    title: 'Approval queues',
    items: [
      { key: 'approvals_face_enrollment', label: 'Face enrollment approvals' },
      { key: 'approvals_visitor_override', label: 'Visitor pre-reg override approvals' },
      { key: 'approvals_clock_in_override', label: 'Clock-in override approvals' },
      { key: 'approvals_new_guard_onboarding', label: 'New-guard onboarding approvals' },
    ],
  },
  {
    title: 'Gate + directory',
    items: [
      { key: 'visitor_pass_override', label: 'Cancel / override visitor passes' },
      { key: 'parcel_management', label: 'Parcel logs + mark collected' },
      { key: 'anpr_logs', label: 'ANPR vehicle logs' },
      { key: 'unrecognized_vehicles', label: 'Review unrecognized vehicles' },
      { key: 'camera_list_view', label: 'View CCTV camera list' },
      { key: 'unit_directory_names_only', label: 'Unit directory (names + unit #)' },
      {
        key: 'member_directory_with_contact',
        label: 'Member directory with contact details',
        help: 'Off by default — external agencies should not see resident PII.',
      },
      { key: 'security_tickets_crud', label: 'Security-category tickets' },
    ],
  },
];

const FACILITY_GROUPS: ToggleGroup[] = [
  {
    title: 'Staff',
    items: [
      { key: 'non_guard_staff_crud', label: 'Create/edit non-guard staff' },
      {
        key: 'guard_staff_crud',
        label: 'Create/edit guard staff',
        help: 'Turn off when security is contracted out to a third party.',
      },
      { key: 'manage_shifts_all', label: 'Manage shifts (all staff)' },
      { key: 'view_attendance', label: 'View attendance reports' },
      { key: 'leave_approve_non_guard', label: 'Approve leave — non-guard' },
      { key: 'leave_approve_all_staff', label: 'Approve leave — all staff' },
    ],
  },
  {
    title: 'Facility ops',
    items: [
      { key: 'maintenance_tickets_crud', label: 'Maintenance tickets (assign, resolve, close)' },
      { key: 'amenity_bookings_manage', label: 'Amenity bookings (cancel, manage slots)' },
      { key: 'utility_readings_record', label: 'Utility readings (record, history)' },
      { key: 'assets_amc_view_and_service_log', label: 'Assets + AMC (view, log service)' },
      { key: 'gate_non_guard_checkin_logs', label: 'Gate check-in logs for non-guard staff' },
      { key: 'member_directory_with_contact', label: 'Member directory with contact details' },
    ],
  },
];

const ENFORCEMENT_OPTIONS: { value: ExpiryEnforcement; label: string; desc: string }[] = [
  {
    value: 'hybrid',
    label: 'Hybrid (recommended)',
    desc: 'Expired roles lose access and an audit-log entry is written on expiry.',
  },
  {
    value: 'filter_only',
    label: 'Filter only',
    desc: 'Expired roles lose access. No audit entry on expiry (quiet).',
  },
  {
    value: 'log_only',
    label: 'Log only (advisory)',
    desc: 'Audit entry on expiry, but the role continues to work. Useful while transitioning policies.',
  },
  {
    value: 'disabled',
    label: 'Disabled',
    desc: 'Ignore expires_at / lease_end_date entirely. Only records the date.',
  },
];

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function RoleDelegationCard(): ReactNode {
  const { data, isLoading } = useRoleDelegation();
  const update = useUpdateRoleDelegation();
  const { addToast } = useToast();

  // Local draft — only the keys the user actually flipped. Cleared on save
  // so the checkbox UI re-reads from `data`.
  const [draft, setDraft] = useState<RoleDelegationUpdate>({});
  const hasChanges =
    Object.keys(draft.security_supervisor ?? {}).length > 0 ||
    Object.keys(draft.facility_supervisor ?? {}).length > 0 ||
    draft.expiry_enforcement !== undefined;

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access &amp; Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Merge draft over data for display — shows "what Save will write" without
  // mutating the server state.
  const effective: RoleDelegation = {
    security_supervisor: {
      ...data.security_supervisor,
      ...(draft.security_supervisor ?? {}),
    } as SecuritySupervisorPermissions,
    facility_supervisor: {
      ...data.facility_supervisor,
      ...(draft.facility_supervisor ?? {}),
    } as FacilitySupervisorPermissions,
    expiry_enforcement: draft.expiry_enforcement ?? data.expiry_enforcement,
  };

  function toggle(
    role: 'security_supervisor' | 'facility_supervisor',
    key: string,
    value: boolean,
  ): void {
    setDraft((d) => ({
      ...d,
      [role]: { ...(d[role] ?? {}), [key]: value },
    }));
  }

  function setEnforcement(value: ExpiryEnforcement): void {
    setDraft((d) => ({ ...d, expiry_enforcement: value }));
  }

  function handleSave(): void {
    update.mutate(draft, {
      onSuccess() {
        setDraft({});
        addToast({ title: 'Access & Roles updated', variant: 'success' });
      },
      onError(err) {
        addToast({
          title: 'Failed to update',
          description: (err as Error).message,
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Access &amp; Roles</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || update.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Fine-grained toggles for the two supervisor roles. Defaults are tuned
          for &quot;external security agency + internal facility supervisor&quot; —
          flip what doesn&apos;t fit your setup. Changes propagate cluster-wide
          within 5 minutes.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Expiry enforcement */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Role expiry enforcement</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Applies to both non-resident <code>expires_at</code> assignments
            (e.g. contract security) and resident agreement expiry (derived
            from the unit&apos;s lease end date).
          </p>
          <Select
            value={effective.expiry_enforcement}
            onChange={(e) => setEnforcement(e.target.value as ExpiryEnforcement)}
            className="max-w-md"
          >
            {ENFORCEMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.desc}
              </option>
            ))}
          </Select>
        </section>

        {/* Security Supervisor toggles */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Security Supervisor</h3>
          </div>
          <ToggleGrid
            groups={SECURITY_GROUPS}
            values={effective.security_supervisor as unknown as Record<string, boolean>}
            onToggle={(key, v) => toggle('security_supervisor', key, v)}
          />
        </section>

        {/* Facility Supervisor toggles */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Facility Supervisor</h3>
          </div>
          <ToggleGrid
            groups={FACILITY_GROUPS}
            values={effective.facility_supervisor as unknown as Record<string, boolean>}
            onToggle={(key, v) => toggle('facility_supervisor', key, v)}
          />
        </section>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Toggle grid subcomponent
// ---------------------------------------------------------------------------

function ToggleGrid({
  groups,
  values,
  onToggle,
}: {
  groups: ToggleGroup[];
  values: Record<string, boolean>;
  onToggle: (key: string, v: boolean) => void;
}): ReactNode {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {groups.map((group) => (
        <div key={group.title} className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <ul className="space-y-2">
            {group.items.map((item) => (
              <li key={item.key} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id={`toggle-${item.key}`}
                  checked={values[item.key] === true}
                  onChange={(e) => onToggle(item.key, e.target.checked)}
                  className="mt-0.5 rounded border-input"
                />
                <div className="flex-1">
                  <label
                    htmlFor={`toggle-${item.key}`}
                    className="cursor-pointer text-sm"
                  >
                    {item.label}
                  </label>
                  {item.help && (
                    <p className="text-xs text-muted-foreground">{item.help}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
