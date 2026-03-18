'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Save, Plus, Power, CalendarRange } from 'lucide-react';
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
} from '@/hooks';

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
        title="Settings"
        description="Manage society configuration, billing rules, and features"
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
    </div>
  );
}
