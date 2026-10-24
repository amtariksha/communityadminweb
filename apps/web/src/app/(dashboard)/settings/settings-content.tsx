'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Save, Shield, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { getCurrentTenant } from '@/lib/auth';
import {
  useTenant,
  useRbacPermissions,
  useUpdatePermission,
  useSeedPermissions,
} from '@/hooks';
import type { RbacPermission } from '@/hooks/use-staff';
import { RoleDelegationCard } from './role-delegation-card';
import { PermissionsGrid, type PermissionCell, type PermissionField } from './permissions-grid';
import { GatesCard } from './gates-card';
import { OverstayThresholdField } from './overstay-threshold-field';
import { ParkingCard } from './parking-card';
import { ReportSchedulesCard } from './report-schedules-card';
import { DuesRemindersCard } from './dues-reminders-card';
import { InterestCard } from './interest-card';
import { TaxRegistrationCard } from './tax-registration-card';
import { GatewayChargeCard } from './gateway-charge-card';
import { BillingGstCard } from './billing-gst-card';
import { GstThresholdYearsCard } from './gst-threshold-years-card';
import { BillingRulesCard } from './billing-rules-card';
import { UnitTypesCard } from './unit-types-card';
import { TdsConfigCard } from './tds-config-card';
import { NotificationPolicyCard } from './notification-policy-card';
import { HelpContactCard } from './help-contact-card';
import { AdminLayoutCard } from './admin-layout-card';
import { AssistantCard } from './assistant-card';
import { OwnerDirectOnboardCard } from './owner-direct-onboard-card';
import { FinancialYearsCard } from './financial-years-card';
import { ModulesCard } from './modules-card';
import { SocietyInfoCard } from './society-info-card';
import { PurchaseApprovalsCard } from './purchase-approvals-card';
import { useEnforcedPermissions } from '@/hooks/use-enforced-permissions';


// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsContent(): ReactNode {
  const { addToast } = useToast();
  const currentTenantId = getCurrentTenant() ?? '';

  // Data queries
  const tenantQuery = useTenant(currentTenantId);

  // Permissions state
  const [permissionChanges, setPermissionChanges] = useState<Record<string, { can_read: boolean; can_write: boolean; can_delete: boolean }>>({});

  // RBAC queries/mutations
  const permissionsQuery = useRbacPermissions();
  const permissions: RbacPermission[] = permissionsQuery.data ?? [];
  const updatePermissionM = useUpdatePermission();
  const seedPermissions = useSeedPermissions();
  const enforcedQuery = useEnforcedPermissions();

  const tenant = tenantQuery.data;

  // ---------------------------------------------------------------------------
  // Permission handlers
  // ---------------------------------------------------------------------------

  function getPermission(role: string, resource: string): PermissionCell {
    const key = `${role}:${resource}`;
    if (permissionChanges[key]) return permissionChanges[key];
    const found = permissions.find((p) => p.role === role && p.resource === resource);
    return found ? { can_read: found.can_read, can_write: found.can_write, can_delete: found.can_delete } : { can_read: false, can_write: false, can_delete: false };
  }

  function handlePermissionChange(role: string, resource: string, field: PermissionField, value: boolean): void {
    const key = `${role}:${resource}`;
    const current = getPermission(role, resource);
    setPermissionChanges((prev) => ({
      ...prev,
      [key]: { ...current, [field]: value },
    }));
  }

  function handleSavePermissions(): void {
    const entries = Object.entries(permissionChanges);
    if (entries.length === 0) {
      addToast({ title: 'No changes to save', variant: 'default' });
      return;
    }

    let completed = 0;
    let hasError = false;
    for (const [key, perms] of entries) {
      const [role, resource] = key.split(':');
      updatePermissionM.mutate(
        { role, resource, ...perms },
        {
          onSuccess() {
            completed += 1;
            if (completed === entries.length && !hasError) {
              setPermissionChanges({});
              addToast({ title: 'Permissions updated', variant: 'success' });
            }
          },
          onError(error) {
            hasError = true;
            addToast({ title: `Failed to update ${role}/${resource}`, description: friendlyError(error), variant: 'destructive' });
          },
        },
      );
    }
  }

  function handleSeedPermissions(): void {
    seedPermissions.mutate(undefined, {
      onSuccess() {
        addToast({ title: 'Default permissions seeded', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to seed permissions', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Financial year handlers
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!currentTenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium">No society selected</p>
        <p className="text-sm text-muted-foreground">Please select a society from the header to manage settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Settings' }]}
        title="Settings"
        description="Society settings — gates, amenities, roles & permissions"
      />

      {/* Society Info — the community admin edits the address (PROF-20). */}
      <SocietyInfoCard />

      {/* Purchase request approvers live in Expense Tracker › Setup › Purchase Request (EXP-07). */}
      <PurchaseApprovalsCard settings={tenant?.settings_json as Record<string, unknown> | undefined} />

      <BillingRulesCard />

      {/* Unit types for billing — names, GST threshold, units per type (INC-15) */}
      <UnitTypesCard />

      {/* ------------------------------------------------------------------- */}
      {/* Modules — read-only; the platform admin switches them (SB-15)       */}
      {/* ------------------------------------------------------------------- */}
      <ModulesCard />

      <FinancialYearsCard />

      <GatesCard>
        <OverstayThresholdField />
      </GatesCard>

      {/* Parking Setup — resident add / edit switches, extra field (PARK-10) */}
      <ParkingCard />

      {/* ------------------------------------------------------------------- */}
      {/* Amenities — set up on the Amenities page (AMEN-03). The copy that   */}
      {/* lived here offered types and pricing the API refused and never sent */}
      {/* its time slots.                                                      */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Amenities</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Add amenities, set how each is charged and manage bookings on the Amenities page.
          </p>
          <Link
            href="/amenities"
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            Open Amenities
          </Link>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Roles & Permissions Section                                          */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Roles &amp; Permissions</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedPermissions}
                disabled={seedPermissions.isPending}
              >
                {seedPermissions.isPending ? 'Seeding...' : 'Seed Defaults'}
              </Button>
              <Button
                size="sm"
                onClick={handleSavePermissions}
                disabled={updatePermissionM.isPending || Object.keys(permissionChanges).length === 0}
              >
                <Save className="mr-2 h-4 w-4" />
                {updatePermissionM.isPending ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {permissionsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <PermissionsGrid
              getPermission={getPermission}
              onChange={handlePermissionChange}
              // Cells no API route checks are greyed out (SB-15).
              enforced={enforcedQuery.data}
            />
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Admin layout — standard or classic, society-wide (SB-01)            */}
      {/* ------------------------------------------------------------------- */}
      <AdminLayoutCard />

      <AssistantCard />

      {/* ------------------------------------------------------------------- */}
      {/* Access & Roles — supervisor toggles + expiry enforcement             */}
      {/* ------------------------------------------------------------------- */}
      <RoleDelegationCard />

      {/* ------------------------------------------------------------------- */}
      {/* Automated Reports — the society's report schedules (REP-08)          */}
      {/* ------------------------------------------------------------------- */}
      <ReportSchedulesCard />

      {/* ------------------------------------------------------------------- */}
      {/* Automatic dues reminders — days of the month (INC-02)               */}
      {/* ------------------------------------------------------------------- */}
      <DuesRemindersCard />

      {/* Billing e-mails, Defaulters list and reminder text (INC-30) live on
          the Income Tracker Setup pages; linked here for the standard layout. */}
      <Card>
        <CardHeader>
          <CardTitle>Billing e-mails and defaulters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link
            href="/income/setup/notifications"
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            Billing e-mails (Notifications)
          </Link>
          <Link
            href="/income/setup/defaulters"
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            Defaulters list, reminder text and log
          </Link>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Late payment interest — rate, due days, basis (INC-07)              */}
      {/* ------------------------------------------------------------------- */}
      <InterestCard />

      {/* ------------------------------------------------------------------- */}
      {/* Tax registration — GSTIN, PAN, registration number (INC-11)         */}
      {/* ------------------------------------------------------------------- */}
      <TaxRegistrationCard />

      {/* ------------------------------------------------------------------- */}
      {/* Online payment charges — who bears the gateway charge (INC-12)      */}
      {/* ------------------------------------------------------------------- */}
      <GatewayChargeCard />
      <BillingGstCard />
      <GstThresholdYearsCard />

      {/* ------------------------------------------------------------------- */}
      {/* Notification Policy — urgent allowlist + default quiet hours        */}
      {/* (NotifPlan §"Phase 5")                                               */}
      {/* ------------------------------------------------------------------- */}
      <NotificationPolicyCard />

      {/* ------------------------------------------------------------------- */}
      {/* Help & Support — per-society contact details (QA #350)              */}
      {/* ------------------------------------------------------------------- */}
      <HelpContactCard />

      {/* ------------------------------------------------------------------- */}
      {/* Owner-initiated tenant onboarding — per-society policy (QA #13-2a)  */}
      {/* Placed adjacent to the help-contact + tds cards because it's        */}
      {/* the same shape: a society-wide knob the community admin owns.       */}
      {/* ------------------------------------------------------------------- */}
      <OwnerDirectOnboardCard />

      {/* ------------------------------------------------------------------- */}
      {/* TDS Configuration — platform default + per-tenant override            */}
      {/* ------------------------------------------------------------------- */}
      <TdsConfigCard />
    </div>
  );
}
