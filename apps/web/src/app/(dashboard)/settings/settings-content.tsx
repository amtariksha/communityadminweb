'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Save, Plus, CalendarRange, MoreVertical, Lock, Unlock, Star, Shield, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { getCurrentTenant, getUser } from '@/lib/auth';
import {
  useTenant,
  useUpdateTenant,
  useTenantSettings,
  useFinancialYears,
  useCreateFinancialYear,
  useSetCurrentYear,
  useFreezeYear,
  useUnfreezeYear,
  useRbacPermissions,
  useUpdatePermission,
  useSeedPermissions,
} from '@/hooks';
import type { RbacPermission } from '@/hooks/use-staff';
import type { FinancialYear } from '@communityos/shared';
import { RoleDelegationCard } from './role-delegation-card';
import { PermissionsGrid, type PermissionCell, type PermissionField } from './permissions-grid';
import { GatesCard } from './gates-card';
import { OverstayThresholdField } from './overstay-threshold-field';
import { AutomatedReportsCard } from './automated-reports-card';
import { DuesRemindersCard } from './dues-reminders-card';
import { InterestCard } from './interest-card';
import { TaxRegistrationCard } from './tax-registration-card';
import { GatewayChargeCard } from './gateway-charge-card';
import { BillingRulesCard } from './billing-rules-card';
import { TdsConfigCard } from './tds-config-card';
import { NotificationPolicyCard } from './notification-policy-card';
import { HelpContactCard } from './help-contact-card';
import { AdminLayoutCard } from './admin-layout-card';
import { OwnerDirectOnboardCard } from './owner-direct-onboard-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ALL_FEATURES } from '@/lib/feature-catalogue';

// ---------------------------------------------------------------------------
// Feature toggle definitions
// ---------------------------------------------------------------------------
//
// Source of truth: lib/feature-catalogue.ts. The community-admin toggle
// list mirrors the super-admin one — every page the sidebar gates plus
// the legacy abstract flags. Previously this file had only 6 abstract
// toggles, so admins couldn't enable Tickets / Voting / Amenities / Gas
// / CCTV / Assets / Documents from the per-society Settings page.

const featureToggles = ALL_FEATURES;

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsContent(): ReactNode {
  const { addToast } = useToast();
  const currentTenantId = getCurrentTenant() ?? '';
  const currentUser = getUser();
  const isSuperAdmin = currentUser?.isSuperAdmin === true;

  // Data queries
  const tenantQuery = useTenant(currentTenantId);
  const fyQuery = useFinancialYears();

  // Mutations
  const updateTenant = useUpdateTenant();
  const updateSettings = useTenantSettings();
  const createFY = useCreateFinancialYear();
  const setCurrentYear = useSetCurrentYear();
  const freezeYear = useFreezeYear();
  const unfreezeYear = useUnfreezeYear();

  // Society info form state
  const [societyName, setSocietyName] = useState('');
  const [societyAddress, setSocietyAddress] = useState('');
  const [societyCity, setSocietyCity] = useState('');
  const [societyState, setSocietyState] = useState('');

  // Financial year dialog state
  const [fyDialogOpen, setFyDialogOpen] = useState(false);
  const [fyLabel, setFyLabel] = useState('');
  const [fyStartDate, setFyStartDate] = useState('');
  const [fyEndDate, setFyEndDate] = useState('');

  // QA #230: styled freeze confirmation dialog (replaces native confirm)
  const [freezeFyTarget, setFreezeFyTarget] = useState<FinancialYear | null>(null);

  // Feature toggles
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  // Purchase Request approval config (stored inside tenant.settings_json)
  const [prApprovalLevels, setPrApprovalLevels] = useState<number>(1);
  const [prApprovalRoles, setPrApprovalRoles] = useState<string>('community_admin');
  const [prApprovalThreshold, setPrApprovalThreshold] = useState<string>('0');

  // Permissions state
  const [permissionChanges, setPermissionChanges] = useState<Record<string, { can_read: boolean; can_write: boolean; can_delete: boolean }>>({});

  // RBAC queries/mutations
  const permissionsQuery = useRbacPermissions();
  const permissions: RbacPermission[] = permissionsQuery.data ?? [];
  const updatePermissionM = useUpdatePermission();
  const seedPermissions = useSeedPermissions();

  const tenant = tenantQuery.data;
  const financialYears = fyQuery.data ?? [];

  // Populate form when tenant data loads
  useEffect(() => {
    if (tenant) {
      setSocietyName(tenant.name ?? '');
      setSocietyAddress(tenant.address ?? '');
      setSocietyCity(tenant.city ?? '');
      setSocietyState(tenant.state ?? '');

      const settingsJson = tenant.settings_json as Record<string, unknown> | undefined;
      if (settingsJson) {
        setFeatures(settingsJson as Record<string, boolean>);
        if (typeof settingsJson.pr_approval_levels === 'number') {
          setPrApprovalLevels(settingsJson.pr_approval_levels);
        }
        if (Array.isArray(settingsJson.pr_approval_roles)) {
          setPrApprovalRoles((settingsJson.pr_approval_roles as string[]).join(', '));
        }
        if (typeof settingsJson.pr_approval_threshold === 'number') {
          setPrApprovalThreshold(String(settingsJson.pr_approval_threshold));
        }
      }
    }
  }, [tenant]);

  // ---------------------------------------------------------------------------
  // Society info handlers
  // ---------------------------------------------------------------------------

  function handleSaveSocietyInfo(e: FormEvent): void {
    e.preventDefault();
    updateTenant.mutate(
      {
        id: currentTenantId,
        data: {
          name: societyName,
          address: societyAddress,
          city: societyCity,
          state: societyState,
        },
      },
      {
        onSuccess() {
          addToast({ title: 'Society info updated', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to update', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Billing rule handlers
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Feature toggle handlers
  // ---------------------------------------------------------------------------

  function handleToggleFeature(key: string, enabled: boolean): void {
    const updatedFeatures = { ...features, [key]: enabled };
    setFeatures(updatedFeatures);
  }

  function handleSaveFeatures(): void {
    // QA #28 — echo back the row_version we read with the tenant so the
    // backend can 409 if another admin wrote between our read and write.
    const expectedVersion = tenantQuery.data?.row_version;
    updateSettings.mutate(
      {
        tenant_id: currentTenantId,
        settings: features as Record<string, boolean>,
        expected_row_version: expectedVersion,
      },
      {
        onSuccess() {
          addToast({ title: 'Feature settings saved', variant: 'success' });
        },
        onError(error) {
          // Detect stale-row 409s so the user knows to refresh rather
          // than wondering why their click failed.
          const msg = error.message ?? '';
          const isConflict =
            msg.toLowerCase().includes('modified by another user') ||
            msg.toLowerCase().includes('conflict');
          addToast({
            title: isConflict ? 'Settings were just changed by someone else' : 'Failed to save settings',
            description: isConflict
              ? 'Reload the page to see the latest values, then try again.'
              : msg,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleSavePrApproval(): void {
    const roles = prApprovalRoles
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const threshold = Number(prApprovalThreshold) || 0;
    const levels = Math.max(0, Math.min(5, Math.floor(prApprovalLevels)));

    // Merge into existing settings (don't clobber feature toggles)
    const merged = {
      ...(features as Record<string, unknown>),
      pr_approval_levels: levels,
      pr_approval_roles: roles,
      pr_approval_threshold: threshold,
    };

    const expectedVersion = tenantQuery.data?.row_version;
    updateSettings.mutate(
      {
        tenant_id: currentTenantId,
        settings: merged as unknown as Record<string, boolean>,
        expected_row_version: expectedVersion,
      },
      {
        onSuccess() {
          addToast({
            title: 'Purchase approval rules saved',
            variant: 'success',
          });
        },
        onError(error) {
          const msg = error.message ?? '';
          const isConflict =
            msg.toLowerCase().includes('modified by another user') ||
            msg.toLowerCase().includes('conflict');
          addToast({
            title: isConflict
              ? 'Rules were just changed by someone else'
              : 'Failed to save approval rules',
            description: isConflict
              ? 'Reload the page to see the latest values, then try again.'
              : msg,
            variant: 'destructive',
          });
        },
      },
    );
  }

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

  function handleCreateFY(e: FormEvent): void {
    e.preventDefault();
    createFY.mutate(
      { label: fyLabel, start_date: fyStartDate, end_date: fyEndDate },
      {
        onSuccess() {
          setFyDialogOpen(false);
          setFyLabel('');
          setFyStartDate('');
          setFyEndDate('');
          addToast({ title: 'Financial year created', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to create financial year', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

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

      {/* ------------------------------------------------------------------- */}
      {/* Society Info Section                                                 */}
      {/* Editable only by super admin. Others see read-only fields and a     */}
      {/* hint directing them to the super-admin dashboard for changes.       */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Society Information</CardTitle>
        </CardHeader>
        <CardContent>
          {tenantQuery.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveSocietyInfo} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="society-name">Society Name</Label>
                <Input
                  id="society-name"
                  required
                  value={societyName}
                  onChange={(e) => setSocietyName(e.target.value)}
                  readOnly={!isSuperAdmin}
                  disabled={!isSuperAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="society-address">Address</Label>
                <Input
                  id="society-address"
                  value={societyAddress}
                  onChange={(e) => setSocietyAddress(e.target.value)}
                  readOnly={!isSuperAdmin}
                  disabled={!isSuperAdmin}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="society-city">City</Label>
                  <Input
                    id="society-city"
                    value={societyCity}
                    onChange={(e) => setSocietyCity(e.target.value)}
                    readOnly={!isSuperAdmin}
                    disabled={!isSuperAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="society-state">State</Label>
                  <Input
                    id="society-state"
                    value={societyState}
                    onChange={(e) => setSocietyState(e.target.value)}
                    readOnly={!isSuperAdmin}
                    disabled={!isSuperAdmin}
                  />
                </div>
              </div>
              {isSuperAdmin ? (
                <div className="flex justify-end">
                  <Button type="submit" disabled={updateTenant.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateTenant.isPending ? 'Saving...' : 'Save Society Info'}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Society details can only be changed by a super admin. Contact
                  support if any of the values above are incorrect.
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Purchase Request Approval Configuration                             */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Request Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Control how purchase requests are approved before becoming vendor
              bills. Set <span className="font-medium">Approval Levels</span> to
              <code className="mx-1 rounded bg-muted px-1">0</code> to
              auto-approve all requests. Set an{' '}
              <span className="font-medium">Auto-Approve Threshold</span> so
              small purchases don&apos;t need signatures — only requests above
              the threshold go through the approval flow.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pr-levels">Approval Levels</Label>
                <Input
                  id="pr-levels"
                  type="number"
                  min="0"
                  max="5"
                  value={prApprovalLevels}
                  onChange={(e) => setPrApprovalLevels(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  0 = no approval needed · 1–5 = sequential approvals
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-threshold">Auto-Approve Threshold (₹)</Label>
                <Input
                  id="pr-threshold"
                  type="number"
                  min="0"
                  step="100"
                  value={prApprovalThreshold}
                  onChange={(e) => setPrApprovalThreshold(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  0 = disabled · above this, approvals required
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-roles">Approver Roles</Label>
                <Input
                  id="pr-roles"
                  placeholder="community_admin, committee_member"
                  value={prApprovalRoles}
                  onChange={(e) => setPrApprovalRoles(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated. Level 1 uses the first role, level 2 the
                  second, etc.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSavePrApproval}
                disabled={updateSettings.isPending}
                size="sm"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateSettings.isPending
                  ? 'Saving...'
                  : 'Save Approval Rules'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <BillingRulesCard />

      {/* ------------------------------------------------------------------- */}
      {/* Feature Toggles Section                                              */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Feature Toggles</CardTitle>
            <Button
              size="sm"
              onClick={handleSaveFeatures}
              disabled={updateSettings.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateSettings.isPending ? 'Saving...' : 'Save Features'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {featureToggles.map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <p className="text-sm font-medium">{toggle.label}</p>
                  <p className="text-xs text-muted-foreground">{toggle.description}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={features[toggle.key] ?? false}
                    onChange={(e) => handleToggleFeature(toggle.key, e.target.checked)}
                  />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Financial Year Section                                               */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Financial Years</CardTitle>
            <Dialog open={fyDialogOpen} onOpenChange={setFyDialogOpen}>
              <DialogTrigger>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Financial Year
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateFY}>
                  <DialogHeader>
                    <DialogTitle>Create Financial Year</DialogTitle>
                    <DialogDescription>Define a new financial year period</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="fy-label">Label</Label>
                      <Input
                        id="fy-label"
                        required
                        placeholder="e.g., FY 2025-26"
                        value={fyLabel}
                        onChange={(e) => setFyLabel(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fy-start">Start Date</Label>
                        <Input
                          id="fy-start"
                          type="date"
                          required
                          value={fyStartDate}
                          onChange={(e) => setFyStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fy-end">End Date</Label>
                        <Input
                          id="fy-end"
                          type="date"
                          required
                          value={fyEndDate}
                          onChange={(e) => setFyEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createFY.isPending}>
                      {createFY.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {fyQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : financialYears.length > 0 ? (
            <div className="space-y-3">
              {financialYears.map((fy) => (
                <div key={fy.id} className="flex items-center justify-between rounded-md border p-4">
                  <div className="flex items-center gap-3">
                    <CalendarRange className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{fy.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(String(fy.start_date))} - {formatDate(String(fy.end_date))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {fy.is_current && <Badge variant="success">Current</Badge>}
                    {fy.is_frozen && <Badge variant="secondary">Frozen</Badge>}
                    {!fy.is_current && !fy.is_frozen && <Badge variant="default">Open</Badge>}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!fy.is_current && (
                          <DropdownMenuItem
                            onClick={() => {
                              setCurrentYear.mutate(fy.id, {
                                onSuccess() {
                                  addToast({ title: `${fy.label} set as current year`, variant: 'success' });
                                },
                                onError(error: Error) {
                                  addToast({ title: 'Failed to set current year', description: friendlyError(error), variant: 'destructive' });
                                },
                              });
                            }}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Set as Current
                          </DropdownMenuItem>
                        )}
                        {!fy.is_frozen && !fy.is_current && (
                          <DropdownMenuItem
                            onClick={() => setFreezeFyTarget(fy)}
                          >
                            <Lock className="mr-2 h-4 w-4" />
                            Freeze Year
                          </DropdownMenuItem>
                        )}
                        {fy.is_frozen && (
                          <DropdownMenuItem
                            onClick={() => {
                              unfreezeYear.mutate(fy.id, {
                                onSuccess() {
                                  addToast({ title: `${fy.label} unfrozen`, variant: 'success' });
                                },
                                onError(error: Error) {
                                  addToast({ title: 'Failed to unfreeze year', description: friendlyError(error), variant: 'destructive' });
                                },
                              });
                            }}
                          >
                            <Unlock className="mr-2 h-4 w-4" />
                            Unfreeze Year
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No financial years defined. Create one to start recording transactions.
            </p>
          )}
        </CardContent>
      </Card>

      {/* QA #230 — Freeze financial year confirmation dialog. Replaces a
          native confirm() so users see the FY end date and the explicit
          journal-entry consequence before locking. */}
      <Dialog
        open={!!freezeFyTarget}
        onOpenChange={(open) => { if (!open) setFreezeFyTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Freeze {freezeFyTarget?.label}?</DialogTitle>
            <DialogDescription>
              Once frozen, no journal entries can be posted before{' '}
              <span className="font-medium">
                {freezeFyTarget ? formatDate(freezeFyTarget.end_date) : ''}
              </span>
              . Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFreezeFyTarget(null)}
              disabled={freezeYear.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={freezeYear.isPending}
              onClick={() => {
                if (!freezeFyTarget) return;
                const target = freezeFyTarget;
                freezeYear.mutate(target.id, {
                  onSuccess() {
                    addToast({ title: `${target.label} frozen`, variant: 'success' });
                    setFreezeFyTarget(null);
                  },
                  onError(error: Error) {
                    addToast({ title: 'Failed to freeze year', description: friendlyError(error), variant: 'destructive' });
                  },
                });
              }}
            >
              {freezeYear.isPending ? 'Freezing…' : 'Freeze Year'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GatesCard>
        <OverstayThresholdField />
      </GatesCard>

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
            <PermissionsGrid getPermission={getPermission} onChange={handlePermissionChange} />
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Admin layout — standard or classic, society-wide (SB-01)            */}
      {/* ------------------------------------------------------------------- */}
      <AdminLayoutCard />

      {/* ------------------------------------------------------------------- */}
      {/* Access & Roles — supervisor toggles + expiry enforcement             */}
      {/* ------------------------------------------------------------------- */}
      <RoleDelegationCard />

      {/* ------------------------------------------------------------------- */}
      {/* Automated Reports — monthly email digest (Batch 15)                  */}
      {/* ------------------------------------------------------------------- */}
      <AutomatedReportsCard />

      {/* ------------------------------------------------------------------- */}
      {/* Automatic dues reminders — days of the month (INC-02)               */}
      {/* ------------------------------------------------------------------- */}
      <DuesRemindersCard />

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
