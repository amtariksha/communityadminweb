'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  DollarSign,
  Activity,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Save,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { normalizePhone } from '@/lib/validation';
import { FormFieldError } from '@/components/ui/form-field-error';
import { useToast } from '@/components/ui/toast';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { TOOLTIP } from '@/lib/tooltip-content';
import {
  useSuperAdminDashboard,
  useTenants,
  useTenant,
  useCreateTenant,
  useUpdateTenant,
  useTenantSettings,
  useUpdateFeatures,
} from '@/hooks';
import { Separator } from '@/components/ui/separator';
import { setCurrentTenant } from '@/lib/auth';
import UserManagement from './user-management';
import AddMemberDialog from './add-member-dialog';
import TenantMembers from './tenant-members';
import PlatformSettings from './platform-settings';
import { ABSTRACT_FEATURES, MODULE_FEATURES } from '@/lib/feature-catalogue';

// API response may include computed fields beyond the base Tenant type
interface TenantRow {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  settings_json: Record<string, boolean>;
  subscription_plan: string;
  price_per_unit: number;
  total_units?: number;
  is_active: boolean;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 20;

// ---------------------------------------------------------------------------
// Feature toggle definitions
// ---------------------------------------------------------------------------
//
// Source of truth: lib/feature-catalogue.ts. Both arrays below map onto
// `tenants.settings_json` boolean keys via PATCH /tenants/:id/features.
// MODULE_FEATURES mirrors the sidebar nav (one entry per gated page);
// ABSTRACT_FEATURES are legacy capability flags kept for compatibility
// with tenants that already have those keys set.

const allFeatureKeys = ABSTRACT_FEATURES;
const allModuleFeatures = MODULE_FEATURES;

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function StatCardSkeleton(): ReactNode {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  );
}

function TenantTableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-5 w-14" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SuperAdminContent(): ReactNode {
  const { addToast } = useToast();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'platform-settings'>('tenants');

  // Add member dialog state
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  // Search and pagination
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Create tenant dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPlan, setFormPlan] = useState('starter');
  const [formPricePerUnit, setFormPricePerUnit] = useState('');
  const [formAdminPhone, setFormAdminPhone] = useState('');

  // Edit tenant dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [editPricePerUnit, setEditPricePerUnit] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editFeatures, setEditFeatures] = useState<Record<string, boolean>>({});

  // Society Information (super-admin-only edit — tenant admins see read-only
  // fields on /settings; this is the only place to change them)
  const [editSocietyName, setEditSocietyName] = useState('');
  const [editSocietyAddress, setEditSocietyAddress] = useState('');
  const [editSocietyCity, setEditSocietyCity] = useState('');
  const [editSocietyState, setEditSocietyState] = useState('');

  // Feature toggles dialog
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [featuresTenantId, setFeaturesTenantId] = useState('');
  const [featuresTenantName, setFeaturesTenantName] = useState('');
  const [editEnabledFeatures, setEditEnabledFeatures] = useState<string[]>([]);

  // Data queries
  const dashboardQuery = useSuperAdminDashboard();
  const tenantsQuery = useTenants({
    search: searchQuery || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const tenantDetailQuery = useTenant(selectedTenantId);

  // Mutations
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const updateSettings = useTenantSettings();
  const updateFeatures = useUpdateFeatures();

  // Derived data
  const dashboard = dashboardQuery.data;
  const tenants = (tenantsQuery.data?.data ?? []) as unknown as TenantRow[];
  const totalTenants = tenantsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalTenants / ITEMS_PER_PAGE));
  const tenantDetail = tenantDetailQuery.data;

  // Populate edit form when detail loads
  const handleRowClick = function openEditDialog(tenantId: string): void {
    setSelectedTenantId(tenantId);
    setEditDialogOpen(true);
  };

  // Sync edit form when tenant detail changes
  if (tenantDetail && editDialogOpen && editPlan === '' && selectedTenantId === tenantDetail.id) {
    setEditPlan(tenantDetail.subscription_plan ?? '');
    setEditPricePerUnit(String(tenantDetail.price_per_unit ?? ''));
    const settingsJson = tenantDetail.settings_json as Record<string, boolean> | undefined;
    if (settingsJson) {
      setEditFeatures(settingsJson);
    }
    setEditSocietyName(tenantDetail.name ?? '');
    setEditSocietyAddress(
      (tenantDetail as unknown as { address?: string | null }).address ?? '',
    );
    setEditSocietyCity(
      (tenantDetail as unknown as { city?: string | null }).city ?? '',
    );
    setEditSocietyState(
      (tenantDetail as unknown as { state?: string | null }).state ?? '',
    );
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleSearch(): void {
    setSearchQuery(searchInput);
    setPage(1);
  }

  function resetCreateForm(): void {
    setFormName('');
    setFormSlug('');
    setFormAddress('');
    setFormCity('');
    setFormState('');
    setFormPlan('starter');
    setFormPricePerUnit('');
    setFormAdminPhone('');
  }

  function handleCreateTenant(e: FormEvent): void {
    e.preventDefault();
    // admin_phone is optional — when the super-admin provides one, we
    // auto-provision a Committee Member user keyed on that number.
    // Junk like 0000000000 would create an unreachable admin, so
    // validate before the tenant row gets created.
    const adminPhone = normalizePhone(formAdminPhone);
    if (!adminPhone.ok) {
      addToast({
        title: 'Invalid admin phone',
        description: adminPhone.error,
        variant: 'destructive',
      });
      return;
    }
    createTenant.mutate(
      {
        name: formName,
        slug: formSlug,
        address: formAddress,
        city: formCity,
        state: formState,
        subscription_plan: formPlan,
        price_per_unit: Number(formPricePerUnit),
        admin_phone: adminPhone.value || undefined,
      },
      {
        onSuccess() {
          setCreateDialogOpen(false);
          resetCreateForm();
          addToast({ title: 'Tenant created', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to create tenant', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function handleUpdateTenant(e: FormEvent): void {
    e.preventDefault();
    updateTenant.mutate(
      {
        id: selectedTenantId,
        data: {
          subscription_plan: editPlan,
          price_per_unit: Number(editPricePerUnit),
        },
      },
      {
        onSuccess() {
          addToast({ title: 'Tenant updated', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to update tenant', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function handleUpdateSocietyInfo(e: FormEvent): void {
    e.preventDefault();
    if (!editSocietyName.trim()) {
      addToast({ title: 'Society name is required', variant: 'destructive' });
      return;
    }
    // Zod schema rejects null for string fields — omit blanks rather than
    // sending null so optional address/city/state just stay unchanged.
    const data: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
    } = { name: editSocietyName.trim() };
    if (editSocietyAddress.trim()) data.address = editSocietyAddress.trim();
    if (editSocietyCity.trim()) data.city = editSocietyCity.trim();
    if (editSocietyState.trim()) data.state = editSocietyState.trim();

    updateTenant.mutate(
      { id: selectedTenantId, data },
      {
        onSuccess() {
          addToast({ title: 'Society information updated', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to update society', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function handleSaveFeatures(): void {
    updateSettings.mutate(
      { tenant_id: selectedTenantId, settings: editFeatures as Record<string, boolean> },
      {
        onSuccess() {
          addToast({ title: 'Features updated', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to update features', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function handleCloseEditDialog(): void {
    setEditDialogOpen(false);
    setSelectedTenantId('');
    setEditPlan('');
    setEditPricePerUnit('');
    setEditFeatures({});
    setEditSocietyName('');
    setEditSocietyAddress('');
    setEditSocietyCity('');
    setEditSocietyState('');
  }

  function handleOpenFeaturesDialog(tenant: TenantRow): void {
    setFeaturesTenantId(tenant.id);
    setFeaturesTenantName(tenant.name);
    const existing = (tenant as unknown as { enabled_features?: string[] }).enabled_features;
    setEditEnabledFeatures(existing ?? allModuleFeatures.map((f) => f.key));
    setFeaturesDialogOpen(true);
  }

  function handleCloseFeaturesDialog(): void {
    setFeaturesDialogOpen(false);
    setFeaturesTenantId('');
    setFeaturesTenantName('');
    setEditEnabledFeatures([]);
  }

  function handleToggleModuleFeature(key: string): void {
    setEditEnabledFeatures((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
    );
  }

  function handleSaveModuleFeatures(): void {
    updateFeatures.mutate(
      { tenantId: featuresTenantId, features: editEnabledFeatures },
      {
        onSuccess() {
          addToast({ title: 'Module features updated', variant: 'success' });
          handleCloseFeaturesDialog();
        },
        onError(error) {
          addToast({ title: 'Failed to update features', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">System Dashboard</h1>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'tenants'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setActiveTab('tenants')}
        >
          <Building2 className="mr-2 h-4 w-4 inline-block" />
          Tenants
        </button>
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setActiveTab('users')}
        >
          <Users className="mr-2 h-4 w-4 inline-block" />
          Users
        </button>
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'platform-settings'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setActiveTab('platform-settings')}
        >
          <Settings className="mr-2 h-4 w-4 inline-block" />
          Platform Settings
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Dashboard Stats                                                      */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-4">
        {dashboardQuery.isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Total Tenants
                  <HelpTooltip text={TOOLTIP.superAdmin.totalTenants} side="right" />
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{dashboard?.total_tenants ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Total Users
                  <HelpTooltip text={TOOLTIP.superAdmin.totalUsers} side="right" />
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{dashboard?.total_users ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Total Revenue
                  <HelpTooltip text={TOOLTIP.superAdmin.totalRevenue} side="right" />
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(dashboard?.total_revenue ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Active Societies
                  <HelpTooltip text={TOOLTIP.superAdmin.activeSocieties} side="right" />
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{dashboard?.active_tenants ?? 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Users Tab                                                            */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'users' && <UserManagement />}

      {/* ------------------------------------------------------------------- */}
      {/* Platform Settings                                                    */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'platform-settings' && <PlatformSettings />}

      {/* ------------------------------------------------------------------- */}
      {/* Tenant List                                                          */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'tenants' && (<>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">All Tenants</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or slug..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                Search
              </Button>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tenant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateTenant}>
                    <DialogHeader>
                      <DialogTitle>Create Tenant</DialogTitle>
                      <DialogDescription>Register a new housing society on the platform</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tenant-name">Society Name</Label>
                          <Input
                            id="tenant-name"
                            required
                            placeholder="e.g., Green Valley CHS"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tenant-slug" className="flex items-center gap-1">
                            Slug
                            <HelpTooltip text={TOOLTIP.superAdmin.slug} />
                          </Label>
                          <Input
                            id="tenant-slug"
                            required
                            placeholder="e.g., green-valley"
                            value={formSlug}
                            onChange={(e) => setFormSlug(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tenant-address">Address</Label>
                        <Input
                          id="tenant-address"
                          required
                          placeholder="Full address"
                          value={formAddress}
                          onChange={(e) => setFormAddress(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tenant-city">City</Label>
                          <Input
                            id="tenant-city"
                            required
                            placeholder="e.g., Mumbai"
                            value={formCity}
                            onChange={(e) => setFormCity(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tenant-state">State</Label>
                          <Input
                            id="tenant-state"
                            required
                            placeholder="e.g., Maharashtra"
                            value={formState}
                            onChange={(e) => setFormState(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tenant-plan">Subscription Plan</Label>
                          <Select
                            id="tenant-plan"
                            value={formPlan}
                            onChange={(e) => setFormPlan(e.target.value)}
                          >
                            <option value="starter">Starter</option>
                            <option value="growth">Growth</option>
                            <option value="enterprise">Enterprise</option>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tenant-price" className="flex items-center gap-1">
                            Price per Unit
                            <HelpTooltip text={TOOLTIP.superAdmin.pricePerUnit} />
                          </Label>
                          <Input
                            id="tenant-price"
                            type="number"
                            min="0"
                            step="1"
                            required
                            placeholder="e.g., 50"
                            value={formPricePerUnit}
                            onChange={(e) => setFormPricePerUnit(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tenant-admin-phone" className="flex items-center gap-1">
                          Admin Phone (Optional)
                          <HelpTooltip text={TOOLTIP.superAdmin.adminPhone} />
                        </Label>
                        <Input
                          id="tenant-admin-phone"
                          placeholder="10-digit mobile (optional +91 prefix)"
                          maxLength={13}
                          inputMode="tel"
                          value={formAdminPhone}
                          onChange={(e) => setFormAdminPhone(e.target.value)}
                        />
                        <FormFieldError error={createTenant.error} field="admin_phone" />
                        <p className="text-xs text-muted-foreground">
                          Auto-creates user and assigns Committee Member role
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={createTenant.isPending}>
                        {createTenant.isPending ? 'Creating...' : 'Create Tenant'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Price/Unit</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Features</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantsQuery.isLoading ? (
                <TenantTableSkeleton />
              ) : tenants.length > 0 ? (
                tenants.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(t.id)}
                  >
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{t.slug}</span>
                    </TableCell>
                    <TableCell className="capitalize">{t.subscription_plan ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {t.price_per_unit != null ? formatCurrency(t.price_per_unit) : '-'}
                    </TableCell>
                    <TableCell className="text-right">{t.total_units ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? 'success' : 'secondary'}>
                        {t.is_active ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(String(t.created_at))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFeaturesDialog(t);
                        }}
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Modules
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentTenant(t.id);
                          localStorage.setItem('communityos_sa_tenant_name', t.name);
                          // QA #51 — full page navigation (not router.push)
                          // so React Query cache is dropped and no stale
                          // tenant data flashes into the dashboard view.
                          window.location.href = '/';
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : null}
            </TableBody>
          </Table>

          {!tenantsQuery.isLoading && tenants.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No tenants found</p>
              <p className="text-sm text-muted-foreground">Create the first tenant to get started</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalTenants} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Edit Tenant Dialog                                                   */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) handleCloseEditDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              {tenantDetail?.name ?? 'Loading...'}
            </DialogDescription>
          </DialogHeader>
          {tenantDetailQuery.isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : tenantDetail ? (
            <div className="space-y-6 py-4">
              {/* Society Information — super-admin-only editor. Tenant admins
                  see a read-only copy on /settings and are pointed here. */}
              <form onSubmit={handleUpdateSocietyInfo} className="space-y-4">
                <h3 className="text-sm font-semibold">Society Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-society-name">Society Name</Label>
                  <Input
                    id="edit-society-name"
                    required
                    value={editSocietyName}
                    onChange={(e) => setEditSocietyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-society-address">Address</Label>
                  <Input
                    id="edit-society-address"
                    value={editSocietyAddress}
                    onChange={(e) => setEditSocietyAddress(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-society-city">City</Label>
                    <Input
                      id="edit-society-city"
                      value={editSocietyCity}
                      onChange={(e) => setEditSocietyCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-society-state">State</Label>
                    <Input
                      id="edit-society-state"
                      value={editSocietyState}
                      onChange={(e) => setEditSocietyState(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={updateTenant.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateTenant.isPending ? 'Saving...' : 'Update Society Info'}
                  </Button>
                </div>
              </form>

              <Separator />

              <form onSubmit={handleUpdateTenant} className="space-y-4">
                <h3 className="text-sm font-semibold">Pricing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-plan">Plan</Label>
                    <Select
                      id="edit-plan"
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                    >
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="enterprise">Enterprise</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Price per Unit</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      min="0"
                      step="1"
                      value={editPricePerUnit}
                      onChange={(e) => setEditPricePerUnit(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={updateTenant.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateTenant.isPending ? 'Saving...' : 'Update Pricing'}
                  </Button>
                </div>
              </form>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Features</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveFeatures}
                    disabled={updateSettings.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateSettings.isPending ? 'Saving...' : 'Save Features'}
                  </Button>
                </div>
                <div className="space-y-2">
                  {allFeatureKeys.map((feature) => (
                    <div key={feature.key} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="text-sm">{feature.label}</span>
                      <input
                        type="checkbox"
                        checked={editFeatures[feature.key] ?? false}
                        onChange={(e) => setEditFeatures({ ...editFeatures, [feature.key]: e.target.checked })}
                        className="rounded border-input"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <TenantMembers
                tenantId={selectedTenantId}
                onAddMember={() => setAddMemberDialogOpen(true)}
              />
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose>
              <Button variant="outline" onClick={handleCloseEditDialog}>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        tenantId={selectedTenantId}
        tenantName={tenantDetail?.name}
      />

      {/* Module Feature Toggles Dialog */}
      <Dialog open={featuresDialogOpen} onOpenChange={(open) => { if (!open) handleCloseFeaturesDialog(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Module Features</DialogTitle>
            <DialogDescription>
              Toggle which modules are visible for {featuresTenantName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {allModuleFeatures.map((feature) => (
              <div key={feature.key} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">{feature.label}</span>
                <input
                  type="checkbox"
                  checked={editEnabledFeatures.includes(feature.key)}
                  onChange={() => handleToggleModuleFeature(feature.key)}
                  className="rounded border-input"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveModuleFeatures} disabled={updateFeatures.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateFeatures.isPending ? 'Saving...' : 'Save Features'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>)}
    </div>
  );
}
