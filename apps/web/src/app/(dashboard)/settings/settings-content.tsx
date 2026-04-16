'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Save, Plus, Power, CalendarRange, MoreVertical, Lock, Unlock, Star, MapPin, Shield, CalendarClock } from 'lucide-react';
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
import { PageHeader } from '@/components/layout/page-header';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { getCurrentTenant } from '@/lib/auth';
import {
  useTenant,
  useUpdateTenant,
  useTenantSettings,
  useInvoiceRules,
  useCreateInvoiceRule,
  useUpdateInvoiceRule,
  useFinancialYears,
  useCreateFinancialYear,
  useSetCurrentYear,
  useFreezeYear,
  useUnfreezeYear,
  useGates,
  useCreateGate,
  useUpdateGate,
  useRbacPermissions,
  useUpdatePermission,
  useSeedPermissions,
  useAmenities,
  useCreateAmenity,
  useUpdateAmenity,
} from '@/hooks';
import type { Gate, RbacPermission } from '@/hooks/use-staff';
import type { Amenity } from '@/hooks/use-amenities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ---------------------------------------------------------------------------
// Feature toggle definitions
// ---------------------------------------------------------------------------

interface FeatureToggle {
  key: string;
  label: string;
  description: string;
}

const featureToggles: FeatureToggle[] = [
  { key: 'ev_module', label: 'EV Charging Module', description: 'Enable electric vehicle charging management' },
  { key: 'digital_voting', label: 'Digital Voting', description: 'Enable online voting for society decisions' },
  { key: 'ai_accounting', label: 'AI Accounting', description: 'Enable AI-powered accounting assistance' },
  { key: 'visitor_management', label: 'Visitor Management', description: 'Enable visitor entry/exit tracking' },
  { key: 'maintenance_requests', label: 'Maintenance Requests', description: 'Enable resident maintenance request system' },
  { key: 'parking_management', label: 'Parking Management', description: 'Enable parking slot allocation and tracking' },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsContent(): ReactNode {
  const { addToast } = useToast();
  const currentTenantId = getCurrentTenant() ?? '';

  // Data queries
  const tenantQuery = useTenant(currentTenantId);
  const rulesQuery = useInvoiceRules();
  const fyQuery = useFinancialYears();

  // Mutations
  const updateTenant = useUpdateTenant();
  const updateSettings = useTenantSettings();
  const createRule = useCreateInvoiceRule();
  const updateRule = useUpdateInvoiceRule();
  const createFY = useCreateFinancialYear();
  const setCurrentYear = useSetCurrentYear();
  const freezeYear = useFreezeYear();
  const unfreezeYear = useUnfreezeYear();

  // Society info form state
  const [societyName, setSocietyName] = useState('');
  const [societyAddress, setSocietyAddress] = useState('');
  const [societyCity, setSocietyCity] = useState('');
  const [societyState, setSocietyState] = useState('');

  // Rule dialog state
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [ruleLedgerAccountId, setRuleLedgerAccountId] = useState('');
  const [ruleFrequency, setRuleFrequency] = useState('monthly');
  const [ruleAmount, setRuleAmount] = useState('');
  const [ruleIsGstApplicable, setRuleIsGstApplicable] = useState(false);
  const [ruleGstRate, setRuleGstRate] = useState('');

  // Financial year dialog state
  const [fyDialogOpen, setFyDialogOpen] = useState(false);
  const [fyLabel, setFyLabel] = useState('');
  const [fyStartDate, setFyStartDate] = useState('');
  const [fyEndDate, setFyEndDate] = useState('');

  // Feature toggles
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  // Gate dialog state
  const [gateDialogOpen, setGateDialogOpen] = useState(false);
  const [editingGateId, setEditingGateId] = useState('');
  const [gateName, setGateName] = useState('');
  const [gateLocation, setGateLocation] = useState('');
  const [gateType, setGateType] = useState('main');

  // Permissions state
  const [permissionChanges, setPermissionChanges] = useState<Record<string, { can_read: boolean; can_write: boolean; can_delete: boolean }>>({});

  // Amenity dialog state
  const [amenityDialogOpen, setAmenityDialogOpen] = useState(false);
  const [editingAmenityId, setEditingAmenityId] = useState('');
  const [amenityName, setAmenityName] = useState('');
  const [amenityType, setAmenityType] = useState('clubhouse');
  const [amenityLocation, setAmenityLocation] = useState('');
  const [amenityCapacity, setAmenityCapacity] = useState('');
  const [amenityPricingType, setAmenityPricingType] = useState('free');
  const [amenityPrice, setAmenityPrice] = useState('');
  const [amenityDeposit, setAmenityDeposit] = useState('');
  const [amenityRules, setAmenityRules] = useState('');
  const [amenityTimeSlots, setAmenityTimeSlots] = useState('');

  // Gate & RBAC queries/mutations
  const gatesQuery = useGates();
  const gatesList: Gate[] = gatesQuery.data ?? [];
  const createGate = useCreateGate();
  const updateGateM = useUpdateGate();

  const permissionsQuery = useRbacPermissions();
  const permissions: RbacPermission[] = permissionsQuery.data ?? [];
  const updatePermissionM = useUpdatePermission();
  const seedPermissions = useSeedPermissions();

  // Amenity queries/mutations
  const amenitiesQuery = useAmenities();
  const amenitiesList: Amenity[] = amenitiesQuery.data?.data ?? [];
  const createAmenityM = useCreateAmenity();
  const updateAmenityM = useUpdateAmenity();

  const tenant = tenantQuery.data;
  const rules = rulesQuery.data ?? [];
  const financialYears = fyQuery.data ?? [];

  // Populate form when tenant data loads
  useEffect(() => {
    if (tenant) {
      setSocietyName(tenant.name ?? '');
      setSocietyAddress(tenant.address ?? '');
      setSocietyCity(tenant.city ?? '');
      setSocietyState(tenant.state ?? '');

      const settingsJson = tenant.settings_json as Record<string, boolean> | undefined;
      if (settingsJson) {
        setFeatures(settingsJson);
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
          addToast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Billing rule handlers
  // ---------------------------------------------------------------------------

  function resetRuleForm(): void {
    setEditingRuleId('');
    setRuleName('');
    setRuleLedgerAccountId('');
    setRuleFrequency('monthly');
    setRuleAmount('');
    setRuleIsGstApplicable(false);
    setRuleGstRate('');
  }

  function handleOpenEditRule(rule: {
    id: string;
    name: string;
    ledger_account_id?: string;
    frequency: string;
    amount: number;
    is_gst_applicable?: boolean;
    gst_rate?: number;
  }): void {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleLedgerAccountId(rule.ledger_account_id ?? '');
    setRuleFrequency(rule.frequency);
    setRuleAmount(String(rule.amount));
    setRuleIsGstApplicable(rule.is_gst_applicable ?? false);
    setRuleGstRate(rule.gst_rate ? String(rule.gst_rate) : '');
    setRuleDialogOpen(true);
  }

  function handleSaveRule(e: FormEvent): void {
    e.preventDefault();

    if (editingRuleId) {
      updateRule.mutate(
        {
          id: editingRuleId,
          data: {
            name: ruleName,
            ledger_account_id: ruleLedgerAccountId,
            frequency: ruleFrequency,
            amount: Number(ruleAmount),
            is_gst_applicable: ruleIsGstApplicable,
            gst_rate: ruleIsGstApplicable && ruleGstRate ? Number(ruleGstRate) : undefined,
          },
        },
        {
          onSuccess() {
            setRuleDialogOpen(false);
            resetRuleForm();
            addToast({ title: 'Billing rule updated', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to update rule', description: error.message, variant: 'destructive' });
          },
        },
      );
    } else {
      createRule.mutate(
        {
          name: ruleName,
          ledger_account_id: ruleLedgerAccountId,
          frequency: ruleFrequency,
          amount: Number(ruleAmount),
          is_gst_applicable: ruleIsGstApplicable,
          gst_rate: ruleIsGstApplicable && ruleGstRate ? Number(ruleGstRate) : undefined,
        },
        {
          onSuccess() {
            setRuleDialogOpen(false);
            resetRuleForm();
            addToast({ title: 'Billing rule created', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to create rule', description: error.message, variant: 'destructive' });
          },
        },
      );
    }
  }

  function handleDeactivateRule(ruleId: string): void {
    updateRule.mutate(
      { id: ruleId, data: { is_active: false } },
      {
        onSuccess() {
          addToast({ title: 'Billing rule deactivated', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to deactivate rule', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Feature toggle handlers
  // ---------------------------------------------------------------------------

  function handleToggleFeature(key: string, enabled: boolean): void {
    const updatedFeatures = { ...features, [key]: enabled };
    setFeatures(updatedFeatures);
  }

  function handleSaveFeatures(): void {
    updateSettings.mutate(
      { tenant_id: currentTenantId, settings: features as Record<string, boolean> },
      {
        onSuccess() {
          addToast({ title: 'Feature settings saved', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to save settings', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Gate handlers
  // ---------------------------------------------------------------------------

  function resetGateForm(): void {
    setEditingGateId('');
    setGateName('');
    setGateLocation('');
    setGateType('main');
  }

  function handleOpenEditGate(gate: Gate): void {
    setEditingGateId(gate.id);
    setGateName(gate.name);
    setGateLocation(gate.location ?? '');
    setGateType(gate.gate_type);
    setGateDialogOpen(true);
  }

  function handleSaveGate(e: FormEvent): void {
    e.preventDefault();
    if (editingGateId) {
      updateGateM.mutate(
        { id: editingGateId, data: { name: gateName, location: gateLocation || undefined, gate_type: gateType } },
        {
          onSuccess() {
            setGateDialogOpen(false);
            resetGateForm();
            addToast({ title: 'Gate updated', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to update gate', description: error.message, variant: 'destructive' });
          },
        },
      );
    } else {
      createGate.mutate(
        { name: gateName, location: gateLocation || undefined, gate_type: gateType },
        {
          onSuccess() {
            setGateDialogOpen(false);
            resetGateForm();
            addToast({ title: 'Gate created', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to create gate', description: error.message, variant: 'destructive' });
          },
        },
      );
    }
  }

  function handleDeactivateGate(gateId: string): void {
    updateGateM.mutate(
      { id: gateId, data: { is_active: false } },
      {
        onSuccess() {
          addToast({ title: 'Gate deactivated', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to deactivate gate', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Permission handlers
  // ---------------------------------------------------------------------------

  const RBAC_RESOURCES = ['finance', 'gate', 'tickets', 'units', 'staff', 'announcements', 'documents', 'reports', 'settings'];
  const RBAC_ROLES = ['community_admin', 'committee_member', 'resident', 'security_guard', 'accountant'];

  function getPermission(role: string, resource: string): { can_read: boolean; can_write: boolean; can_delete: boolean } {
    const key = `${role}:${resource}`;
    if (permissionChanges[key]) return permissionChanges[key];
    const found = permissions.find((p) => p.role === role && p.resource === resource);
    return found ? { can_read: found.can_read, can_write: found.can_write, can_delete: found.can_delete } : { can_read: false, can_write: false, can_delete: false };
  }

  function handlePermissionChange(role: string, resource: string, field: 'can_read' | 'can_write' | 'can_delete', value: boolean): void {
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
            addToast({ title: `Failed to update ${role}/${resource}`, description: error.message, variant: 'destructive' });
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
        addToast({ title: 'Failed to seed permissions', description: error.message, variant: 'destructive' });
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
          addToast({ title: 'Failed to create financial year', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Amenity handlers
  // ---------------------------------------------------------------------------

  function openAmenityDialog(amenity?: Amenity): void {
    if (amenity) {
      setEditingAmenityId(amenity.id);
      setAmenityName(amenity.name);
      setAmenityType(amenity.type);
      setAmenityLocation(amenity.location ?? '');
      setAmenityCapacity(amenity.capacity ? String(amenity.capacity) : '');
      setAmenityPricingType(amenity.pricing_type);
      setAmenityPrice(amenity.price ? String(amenity.price) : '');
      setAmenityDeposit(amenity.deposit ? String(amenity.deposit) : '');
      setAmenityRules(amenity.rules ?? '');
      setAmenityTimeSlots(amenity.time_slots ?? '');
    } else {
      setEditingAmenityId('');
      setAmenityName('');
      setAmenityType('clubhouse');
      setAmenityLocation('');
      setAmenityCapacity('');
      setAmenityPricingType('free');
      setAmenityPrice('');
      setAmenityDeposit('');
      setAmenityRules('');
      setAmenityTimeSlots('');
    }
    setAmenityDialogOpen(true);
  }

  function handleSaveAmenity(e: FormEvent): void {
    e.preventDefault();
    if (!amenityName.trim()) {
      addToast({ title: 'Amenity name is required', variant: 'destructive' });
      return;
    }

    const payload = {
      name: amenityName.trim(),
      amenity_type: amenityType,
      location: amenityLocation.trim() || null,
      capacity: amenityCapacity ? Number(amenityCapacity) : null,
      pricing_type: amenityPricingType,
      price_per_unit: amenityPrice ? Number(amenityPrice) : 0,
      deposit_amount: amenityDeposit ? Number(amenityDeposit) : 0,
      rules: amenityRules.trim() || null,
    };

    if (editingAmenityId) {
      updateAmenityM.mutate(
        { id: editingAmenityId, ...payload },
        {
          onSuccess() {
            setAmenityDialogOpen(false);
            addToast({ title: 'Amenity updated', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to update amenity', description: error.message, variant: 'destructive' });
          },
        },
      );
    } else {
      createAmenityM.mutate(payload, {
        onSuccess() {
          setAmenityDialogOpen(false);
          addToast({ title: 'Amenity created', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to create amenity', description: error.message, variant: 'destructive' });
        },
      });
    }
  }

  function handleToggleAmenity(amenity: Amenity): void {
    updateAmenityM.mutate(
      { id: amenity.id, is_active: !amenity.is_active },
      {
        onSuccess() {
          addToast({
            title: amenity.is_active ? 'Amenity deactivated' : 'Amenity activated',
            variant: 'success',
          });
        },
        onError(error) {
          addToast({ title: 'Failed to update amenity', description: error.message, variant: 'destructive' });
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="society-address">Address</Label>
                <Input
                  id="society-address"
                  value={societyAddress}
                  onChange={(e) => setSocietyAddress(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="society-city">City</Label>
                  <Input
                    id="society-city"
                    value={societyCity}
                    onChange={(e) => setSocietyCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="society-state">State</Label>
                  <Input
                    id="society-state"
                    value={societyState}
                    onChange={(e) => setSocietyState(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={updateTenant.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateTenant.isPending ? 'Saving...' : 'Save Society Info'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Billing Rules Section                                                */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Billing Rules</CardTitle>
            <Dialog open={ruleDialogOpen} onOpenChange={(open) => { setRuleDialogOpen(open); if (!open) resetRuleForm(); }}>
              <DialogTrigger>
                <Button size="sm" onClick={() => resetRuleForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSaveRule}>
                  <DialogHeader>
                    <DialogTitle>{editingRuleId ? 'Edit Billing Rule' : 'Create Billing Rule'}</DialogTitle>
                    <DialogDescription>
                      {editingRuleId
                        ? 'Update the billing rule configuration'
                        : 'Define a new recurring billing rule for invoicing'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="rule-name">Rule Name</Label>
                      <Input
                        id="rule-name"
                        required
                        placeholder="e.g., Monthly Maintenance"
                        value={ruleName}
                        onChange={(e) => setRuleName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rule-account">Ledger Account ID</Label>
                      <Input
                        id="rule-account"
                        required
                        placeholder="Ledger account ID"
                        value={ruleLedgerAccountId}
                        onChange={(e) => setRuleLedgerAccountId(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rule-frequency">Frequency</Label>
                        <Select
                          id="rule-frequency"
                          value={ruleFrequency}
                          onChange={(e) => setRuleFrequency(e.target.value)}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="half_yearly">Half-Yearly</option>
                          <option value="yearly">Yearly</option>
                          <option value="one_time">One-Time</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rule-amount">Amount</Label>
                        <Input
                          id="rule-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={ruleAmount}
                          onChange={(e) => setRuleAmount(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="rule-gst"
                        checked={ruleIsGstApplicable}
                        onChange={(e) => setRuleIsGstApplicable(e.target.checked)}
                        className="rounded border-input"
                      />
                      <Label htmlFor="rule-gst" className="mb-0">GST Applicable</Label>
                    </div>
                    {ruleIsGstApplicable && (
                      <div className="space-y-2">
                        <Label htmlFor="rule-gst-rate">GST Rate (%)</Label>
                        <Input
                          id="rule-gst-rate"
                          type="number"
                          min="0"
                          max="28"
                          step="0.01"
                          placeholder="e.g., 18"
                          value={ruleGstRate}
                          onChange={(e) => setRuleGstRate(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createRule.isPending || updateRule.isPending}>
                      {(createRule.isPending || updateRule.isPending) ? 'Saving...' : 'Save Rule'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {rulesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="capitalize">{rule.frequency?.replace('_', ' ')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(rule.amount)}</TableCell>
                    <TableCell>
                      {rule.is_gst_applicable ? (
                        <span className="text-sm">{rule.gst_rate}%</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? 'success' : 'secondary'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 p-1 text-xs"
                          onClick={() => handleOpenEditRule(rule)}
                        >
                          Edit
                        </Button>
                        {rule.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 p-1 text-xs text-destructive"
                            onClick={() => handleDeactivateRule(rule.id)}
                            disabled={updateRule.isPending}
                          >
                            <Power className="mr-1 h-3 w-3" />
                            Off
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No billing rules configured. Create one to start generating invoices.</p>
          )}
        </CardContent>
      </Card>

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
                                  addToast({ title: 'Failed to set current year', description: error.message, variant: 'destructive' });
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
                            onClick={() => {
                              if (!confirm(`Freeze ${fy.label}? No transactions can be posted to a frozen year.`)) return;
                              freezeYear.mutate(fy.id, {
                                onSuccess() {
                                  addToast({ title: `${fy.label} frozen`, variant: 'success' });
                                },
                                onError(error: Error) {
                                  addToast({ title: 'Failed to freeze year', description: error.message, variant: 'destructive' });
                                },
                              });
                            }}
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
                                  addToast({ title: 'Failed to unfreeze year', description: error.message, variant: 'destructive' });
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
      {/* ------------------------------------------------------------------- */}
      {/* Gates Configuration Section                                          */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gates Configuration</CardTitle>
            <Dialog open={gateDialogOpen} onOpenChange={(open) => { setGateDialogOpen(open); if (!open) resetGateForm(); }}>
              <DialogTrigger>
                <Button size="sm" onClick={() => resetGateForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Gate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSaveGate}>
                  <DialogHeader>
                    <DialogTitle>{editingGateId ? 'Edit Gate' : 'Add Gate'}</DialogTitle>
                    <DialogDescription>
                      {editingGateId ? 'Update gate configuration' : 'Add a new gate entry point'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="gate-name">Gate Name</Label>
                      <Input
                        id="gate-name"
                        required
                        placeholder="e.g., Main Gate"
                        value={gateName}
                        onChange={(e) => setGateName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gate-location">Location</Label>
                      <Input
                        id="gate-location"
                        placeholder="e.g., North entrance"
                        value={gateLocation}
                        onChange={(e) => setGateLocation(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gate-type">Type</Label>
                      <Select
                        id="gate-type"
                        value={gateType}
                        onChange={(e) => setGateType(e.target.value)}
                      >
                        <option value="main">Main</option>
                        <option value="service">Service</option>
                        <option value="parking">Parking</option>
                        <option value="emergency">Emergency</option>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createGate.isPending || updateGateM.isPending}>
                      {(createGate.isPending || updateGateM.isPending) ? 'Saving...' : 'Save Gate'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {gatesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : gatesList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Staff Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gatesList.map((gate) => (
                  <TableRow key={gate.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {gate.name}
                      </div>
                    </TableCell>
                    <TableCell>{gate.location ?? '-'}</TableCell>
                    <TableCell className="capitalize">{gate.gate_type}</TableCell>
                    <TableCell>{gate.staff_count ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={gate.is_active ? 'success' : 'secondary'}>
                        {gate.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditGate(gate)}>
                            Edit
                          </DropdownMenuItem>
                          {gate.is_active && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeactivateGate(gate.id)}
                            >
                              <Power className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No gates configured. Add gates to manage entry points.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Amenities Section                                                    */}
      {/* ------------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Amenities</CardTitle>
            </div>
            <Button size="sm" onClick={() => openAmenityDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Add Amenity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {amenitiesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : amenitiesList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {amenitiesList.map((amenity) => (
                  <TableRow key={amenity.id}>
                    <TableCell className="font-medium">{amenity.name}</TableCell>
                    <TableCell className="capitalize">{amenity.type}</TableCell>
                    <TableCell className="text-muted-foreground">{amenity.location ?? '-'}</TableCell>
                    <TableCell>{amenity.capacity ?? '-'}</TableCell>
                    <TableCell className="capitalize">{amenity.pricing_type}</TableCell>
                    <TableCell className="text-right">{amenity.price > 0 ? formatCurrency(amenity.price) : 'Free'}</TableCell>
                    <TableCell>
                      <Badge variant={amenity.is_active ? 'success' : 'secondary'}>
                        {amenity.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openAmenityDialog(amenity)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleAmenity(amenity)}>
                            {amenity.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No amenities configured. Add amenities to enable booking.
            </p>
          )}
        </CardContent>

        {/* Create/Edit amenity dialog */}
        <Dialog open={amenityDialogOpen} onOpenChange={setAmenityDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingAmenityId ? 'Edit Amenity' : 'Add Amenity'}</DialogTitle>
              <DialogDescription>
                {editingAmenityId ? 'Update amenity details' : 'Create a new bookable amenity'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveAmenity} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amenity-name">Name</Label>
                  <Input
                    id="amenity-name"
                    value={amenityName}
                    onChange={(e) => setAmenityName(e.target.value)}
                    placeholder="e.g. Clubhouse"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amenity-type">Type</Label>
                  <Select
                    id="amenity-type"
                    value={amenityType}
                    onChange={(e) => setAmenityType(e.target.value)}
                  >
                    <option value="clubhouse">Clubhouse</option>
                    <option value="swimming_pool">Swimming Pool</option>
                    <option value="gym">Gym</option>
                    <option value="sports_court">Sports Court</option>
                    <option value="party_hall">Party Hall</option>
                    <option value="terrace">Terrace</option>
                    <option value="guest_room">Guest Room</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amenity-location">Location</Label>
                  <Input
                    id="amenity-location"
                    value={amenityLocation}
                    onChange={(e) => setAmenityLocation(e.target.value)}
                    placeholder="e.g. Block A Ground Floor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amenity-capacity">Capacity</Label>
                  <Input
                    id="amenity-capacity"
                    type="number"
                    value={amenityCapacity}
                    onChange={(e) => setAmenityCapacity(e.target.value)}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amenity-pricing">Pricing Type</Label>
                  <Select
                    id="amenity-pricing"
                    value={amenityPricingType}
                    onChange={(e) => setAmenityPricingType(e.target.value)}
                  >
                    <option value="free">Free</option>
                    <option value="per_hour">Per Hour</option>
                    <option value="per_slot">Per Slot</option>
                    <option value="per_day">Per Day</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amenity-price">Price</Label>
                  <Input
                    id="amenity-price"
                    type="number"
                    value={amenityPrice}
                    onChange={(e) => setAmenityPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amenity-deposit">Deposit</Label>
                  <Input
                    id="amenity-deposit"
                    type="number"
                    value={amenityDeposit}
                    onChange={(e) => setAmenityDeposit(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amenity-rules">Rules</Label>
                <Input
                  id="amenity-rules"
                  value={amenityRules}
                  onChange={(e) => setAmenityRules(e.target.value)}
                  placeholder="e.g. No shoes, max 4 hours"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amenity-timeslots">Time Slots</Label>
                <Input
                  id="amenity-timeslots"
                  value={amenityTimeSlots}
                  onChange={(e) => setAmenityTimeSlots(e.target.value)}
                  placeholder="e.g. 06:00-09:00, 16:00-21:00"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">Cancel</Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={createAmenityM.isPending || updateAmenityM.isPending}
                >
                  {(createAmenityM.isPending || updateAmenityM.isPending) ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
            <>
            <div className="mb-4 flex items-center gap-6 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
              <span className="font-medium">Legend:</span>
              <span className="flex items-center gap-1"><span className="font-bold text-green-500">R</span> = Read (view data)</span>
              <span className="flex items-center gap-1"><span className="font-bold text-blue-500">W</span> = Write (create &amp; edit)</span>
              <span className="flex items-center gap-1"><span className="font-bold text-red-500">D</span> = Delete (remove data)</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">Role</TableHead>
                    {RBAC_RESOURCES.map((resource) => (
                      <TableHead key={resource} className="text-center capitalize min-w-[100px]">
                        {resource}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RBAC_ROLES.map((role) => (
                    <TableRow key={role}>
                      <TableCell className="sticky left-0 bg-background font-medium capitalize whitespace-nowrap">
                        {role.replace(/_/g, ' ')}
                      </TableCell>
                      {RBAC_RESOURCES.map((resource) => {
                        const perms = getPermission(role, resource);
                        return (
                          <TableCell key={resource} className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <label className="flex flex-col items-center gap-0.5 cursor-pointer" title="Read">
                                <span className="text-[10px] text-green-500 font-bold">R</span>
                                <input
                                  type="checkbox"
                                  className="rounded border-input"
                                  checked={perms.can_read}
                                  onChange={(e) => handlePermissionChange(role, resource, 'can_read', e.target.checked)}
                                />
                              </label>
                              <label className="flex flex-col items-center gap-0.5 cursor-pointer" title="Write">
                                <span className="text-[10px] text-blue-500 font-bold">W</span>
                                <input
                                  type="checkbox"
                                  className="rounded border-input"
                                  checked={perms.can_write}
                                  onChange={(e) => handlePermissionChange(role, resource, 'can_write', e.target.checked)}
                                />
                              </label>
                              <label className="flex flex-col items-center gap-0.5 cursor-pointer" title="Delete">
                                <span className="text-[10px] text-red-500 font-bold">D</span>
                                <input
                                  type="checkbox"
                                  className="rounded border-input"
                                  checked={perms.can_delete}
                                  onChange={(e) => handlePermissionChange(role, resource, 'can_delete', e.target.checked)}
                                />
                              </label>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
