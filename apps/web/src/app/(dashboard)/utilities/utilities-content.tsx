'use client';

import { useState, type ReactNode } from 'react';
import {
  Plus,
  Droplets,
  Zap,
  Flame,
  Calculator,
  FileText,
  Upload,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useUtilityStats,
  useMeters,
  useSlabs,
  useUtilityBills,
  useCreateMeter,
  useUpdateMeter,
  useCreateSlab,
  useUpdateSlab,
  useDeleteSlab,
  useSubmitReading,
  useSubmitBulkReadings,
  useCalculateBills,
  useBillToInvoice,
  useReadings,
} from '@/hooks';
import { useUnits } from '@/hooks';
import { useLedgerAccounts } from '@/hooks';
import type {
  Meter,
  Slab,
  UtilityBill,
} from '@/hooks/use-utilities';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const METER_TYPES = ['water', 'electricity', 'gas'] as const;

function meterTypeIcon(type: string): ReactNode {
  switch (type) {
    case 'water':
      return <Droplets className="h-4 w-4 text-blue-500" />;
    case 'electricity':
      return <Zap className="h-4 w-4 text-yellow-500" />;
    case 'gas':
      return <Flame className="h-4 w-4 text-orange-500" />;
    default:
      return null;
  }
}

function billStatusVariant(
  status: string,
): 'warning' | 'success' | 'secondary' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'invoiced':
      return 'success';
    case 'paid':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Tab constants
// ---------------------------------------------------------------------------

type Tab = 'meters' | 'slabs' | 'readings' | 'bills';

const TABS: { key: Tab; label: string }[] = [
  { key: 'meters', label: 'Meters' },
  { key: 'slabs', label: 'Slab Rates' },
  { key: 'readings', label: 'Readings' },
  { key: 'bills', label: 'Bills' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UtilitiesContent(): ReactNode {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('meters');

  // Shared state
  const [meterTypeFilter, setMeterTypeFilter] = useState('');

  // Stats
  const statsQuery = useUtilityStats();
  const stats = statsQuery.data;

  // Meters data for export
  const allMetersQuery = useMeters({ meter_type: meterTypeFilter || undefined });
  const allMeters = allMetersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Utilities' }]}
        title="Utilities"
        description="Manage metered billing for water, electricity, and gas"
        actions={
          <ExportButton
            data={allMeters as unknown as Record<string, unknown>[]}
            filename={`utility-meters-${new Date().toISOString().split('T')[0]}`}
            columns={[
              { key: 'meter_number', label: 'Meter #' },
              { key: 'meter_type', label: 'Type' },
              { key: 'unit_number', label: 'Unit' },
              { key: 'is_active', label: 'Active' },
              { key: 'last_reading', label: 'Last Reading' },
            ]}
          />
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Meters</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.active_meters ?? 0}</div>
                <p className="text-xs text-muted-foreground">of {stats?.total_meters ?? 0} total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
                <Calculator className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_pending_bills ?? 0}</div>
                <p className="text-xs text-muted-foreground">Awaiting invoicing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
                <FileText className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.total_billed_amount ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unbilled Readings</CardTitle>
                <Upload className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.unbilled_readings ?? 0}</div>
                <p className="text-xs text-muted-foreground">Readings without bills</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'meters' && <MetersTab meterTypeFilter={meterTypeFilter} setMeterTypeFilter={setMeterTypeFilter} />}
      {activeTab === 'slabs' && <SlabsTab />}
      {activeTab === 'readings' && <ReadingsTab />}
      {activeTab === 'bills' && <BillsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meters Tab
// ---------------------------------------------------------------------------

function MetersTab({
  meterTypeFilter,
  setMeterTypeFilter,
}: {
  meterTypeFilter: string;
  setMeterTypeFilter: (v: string) => void;
}): ReactNode {
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [newUnitId, setNewUnitId] = useState('');
  const [newMeterType, setNewMeterType] = useState<'water' | 'electricity' | 'gas'>('water');
  const [newMeterNumber, setNewMeterNumber] = useState('');
  // Common society meters (borewell, common area lighting, gas manifold etc.)
  // are NOT attached to a unit. When this flag is on, unit selection is
  // hidden and backend creates the meter with unit_id = NULL, is_common=true.
  const [newIsCommon, setNewIsCommon] = useState(false);

  const metersQuery = useMeters({
    meter_type: meterTypeFilter || undefined,
  });
  const unitsQuery = useUnits();
  const createMutation = useCreateMeter();
  const updateMutation = useUpdateMeter();

  const meters = metersQuery.data ?? [];
  const units = unitsQuery.data?.data ?? [];

  function handleCreate(): void {
    if (!newMeterNumber.trim()) {
      addToast({ title: 'Meter number is required', variant: 'destructive' });
      return;
    }
    if (!newIsCommon && !newUnitId) {
      addToast({
        title: 'Select a unit or mark the meter as a common society meter',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(
      {
        unit_id: newIsCommon ? null : newUnitId,
        is_common: newIsCommon,
        meter_type: newMeterType,
        meter_number: newMeterNumber.trim(),
      },
      {
        onSuccess() {
          addToast({ title: 'Meter created', variant: 'success' });
          setCreateOpen(false);
          setNewUnitId('');
          setNewMeterNumber('');
          setNewIsCommon(false);
        },
        onError(error) {
          addToast({ title: 'Failed to create meter', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function handleToggleActive(meter: Meter): void {
    updateMutation.mutate(
      { id: meter.id, is_active: !meter.is_active },
      {
        onSuccess() {
          addToast({
            title: `Meter ${meter.is_active ? 'deactivated' : 'activated'}`,
            variant: 'success',
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Meters</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={meterTypeFilter} onChange={(e) => setMeterTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {METER_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Meter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Meter Number</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metersQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : meters.length > 0 ? (
              meters.map((meter) => (
                <TableRow key={meter.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {meterTypeIcon(meter.meter_type)}
                      <span className="capitalize">{meter.meter_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{meter.meter_number}</TableCell>
                  <TableCell>
                    {meter.is_common ? (
                      <Badge variant="secondary">Common</Badge>
                    ) : (
                      (meter.unit_number ?? meter.unit_id ?? '—')
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={meter.is_active ? 'success' : 'secondary'}>
                      {meter.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(meter.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleToggleActive(meter)}
                      title={meter.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {meter.is_active ? (
                        <ToggleRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No meters found. Add meters to start tracking utility consumption.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create meter dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Meter</DialogTitle>
            <DialogDescription>Register a new utility meter for a unit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Scope toggle: per-unit vs society-wide */}
            <div className="flex items-center gap-3 rounded-md border p-3">
              <input
                type="checkbox"
                id="meter-is-common"
                checked={newIsCommon}
                onChange={(e) => {
                  setNewIsCommon(e.target.checked);
                  if (e.target.checked) setNewUnitId('');
                }}
                className="rounded border-input"
              />
              <div>
                <Label htmlFor="meter-is-common" className="mb-0 cursor-pointer">
                  Common society meter
                </Label>
                <p className="text-xs text-muted-foreground">
                  Shared meter (borewell pump, common lighting, gas manifold) — not tied to a unit.
                </p>
              </div>
            </div>

            {!newIsCommon && (
              <div className="space-y-2">
                <Label htmlFor="meter-unit">Unit</Label>
                <UnitSearchSelect
                  value={newUnitId}
                  onChange={setNewUnitId}
                  units={units}
                  placeholder="Search unit..."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="meter-type">Meter Type</Label>
              <Select id="meter-type" value={newMeterType} onChange={(e) => setNewMeterType(e.target.value as 'water' | 'electricity' | 'gas')}>
                {METER_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meter-number">Meter Number</Label>
              <Input id="meter-number" placeholder="e.g. WM-101" value={newMeterNumber} onChange={(e) => setNewMeterNumber(e.target.value)} />
            </div>
            {newMeterType === 'gas' && (
              <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                For gas pricing plans &amp; wallet recharges, use the{' '}
                <a href="/gas" className="font-medium text-primary underline-offset-2 hover:underline">
                  Gas Management
                </a>{' '}
                page. Utility slabs here are used as fallback when no matching plan is configured.
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button disabled={createMutation.isPending} onClick={handleCreate}>
              {createMutation.isPending ? 'Creating...' : 'Add Meter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Slabs Tab
// ---------------------------------------------------------------------------

function SlabsTab(): ReactNode {
  const { addToast } = useToast();
  const [typeFilter, setTypeFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [formType, setFormType] = useState<'water' | 'electricity' | 'gas'>('water');
  const [formFrom, setFormFrom] = useState('0');
  const [formTo, setFormTo] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formEffFrom, setFormEffFrom] = useState(today());
  const [formLabel, setFormLabel] = useState('');

  const slabsQuery = useSlabs(typeFilter || undefined);
  const createMutation = useCreateSlab();
  const deleteMutation = useDeleteSlab();

  const slabs = slabsQuery.data ?? [];

  function handleCreate(): void {
    if (!formRate) {
      addToast({ title: 'Rate per unit is required', variant: 'destructive' });
      return;
    }

    createMutation.mutate(
      {
        meter_type: formType,
        slab_from: parseFloat(formFrom) || 0,
        slab_to: formTo ? parseFloat(formTo) : null,
        rate_per_unit: parseFloat(formRate),
        effective_from: formEffFrom,
        label: formLabel || null,
      },
      {
        onSuccess() {
          addToast({ title: 'Slab rate created', variant: 'success' });
          setCreateOpen(false);
          setFormFrom('0');
          setFormTo('');
          setFormRate('');
          setFormLabel('');
        },
        onError(error) {
          addToast({ title: 'Failed to create slab', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function handleDelete(slabId: string): void {
    deleteMutation.mutate(slabId, {
      onSuccess() {
        addToast({ title: 'Slab deleted', variant: 'success' });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Slab Rates</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {METER_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Slab
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Range (units)</TableHead>
              <TableHead>Rate/Unit</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slabsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : slabs.length > 0 ? (
              slabs.map((slab) => (
                <TableRow key={slab.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {meterTypeIcon(slab.meter_type)}
                      <span className="capitalize">{slab.meter_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {Number(slab.slab_from)} – {slab.slab_to !== null ? Number(slab.slab_to) : '∞'}
                  </TableCell>
                  <TableCell>{formatCurrency(Number(slab.rate_per_unit))}</TableCell>
                  <TableCell className="text-muted-foreground">{slab.label ?? '—'}</TableCell>
                  <TableCell>{formatDate(slab.effective_from)}</TableCell>
                  <TableCell>{slab.effective_to ? formatDate(slab.effective_to) : '—'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => handleDelete(slab.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No slab rates configured. Add slabs to enable bill calculation.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create slab dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Slab Rate</DialogTitle>
            <DialogDescription>Define a pricing tier for metered billing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Meter Type</Label>
              <Select value={formType} onChange={(e) => setFormType(e.target.value as 'water' | 'electricity' | 'gas')}>
                {METER_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From (units)</Label>
                <Input type="number" value={formFrom} onChange={(e) => setFormFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To (units)</Label>
                <Input type="number" placeholder="∞ if empty" value={formTo} onChange={(e) => setFormTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rate per Unit (₹)</Label>
              <Input type="number" step="0.01" placeholder="e.g. 5.00" value={formRate} onChange={(e) => setFormRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input placeholder="e.g. Basic tier" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input type="date" value={formEffFrom} onChange={(e) => setFormEffFrom(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button disabled={createMutation.isPending} onClick={handleCreate}>
              {createMutation.isPending ? 'Creating...' : 'Add Slab'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Readings Tab
// ---------------------------------------------------------------------------

function ReadingsTab(): ReactNode {
  const { addToast } = useToast();
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [readingValue, setReadingValue] = useState('');
  const [readingDate, setReadingDate] = useState(today());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCsv, setBulkCsv] = useState('');

  const metersQuery = useMeters();
  const readingsQuery = useReadings(selectedMeterId);
  const submitMutation = useSubmitReading();
  const bulkMutation = useSubmitBulkReadings();

  const meters = metersQuery.data ?? [];
  const readings = readingsQuery.data?.data ?? [];

  function handleSubmitReading(): void {
    if (!selectedMeterId || !readingValue) {
      addToast({ title: 'Select a meter and enter reading value', variant: 'destructive' });
      return;
    }

    submitMutation.mutate(
      {
        meter_id: selectedMeterId,
        reading_value: parseFloat(readingValue),
        reading_date: readingDate,
      },
      {
        onSuccess() {
          addToast({ title: 'Reading submitted', variant: 'success' });
          setReadingValue('');
        },
        onError(error) {
          addToast({ title: 'Failed to submit reading', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function handleBulkUpload(): void {
    if (!bulkCsv.trim()) {
      addToast({ title: 'Paste CSV data', variant: 'destructive' });
      return;
    }

    const lines = bulkCsv
      .trim()
      .split('\n')
      .filter((line) => line.trim() !== '');

    const readings: Array<{
      meter_number: string;
      reading_value: number;
      reading_date: string;
    }> = [];

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length < 3) continue;
      if (parts[0].toLowerCase() === 'meter_number') continue;

      const val = parseFloat(parts[1]);
      if (isNaN(val)) continue;

      readings.push({
        meter_number: parts[0],
        reading_value: val,
        reading_date: parts[2],
      });
    }

    if (readings.length === 0) {
      addToast({ title: 'No valid readings found in CSV', variant: 'destructive' });
      return;
    }

    bulkMutation.mutate(
      { readings },
      {
        onSuccess(res) {
          const result = res.data;
          // QA #50 — when rows are skipped, show the per-row reasons
          // in the toast description so the user can fix the CSV and
          // retry. The backend now returns structured
          // {row, meter_number, error} objects.
          const description =
            result.errors && result.errors.length > 0
              ? result.errors
                  .slice(0, 5)
                  .map(
                    (e) => `Row ${e.row} (${e.meter_number}): ${e.error}`,
                  )
                  .join('\n') +
                (result.errors.length > 5
                  ? `\n…and ${result.errors.length - 5} more`
                  : '')
              : undefined;
          addToast({
            title: `Bulk upload: ${result.submitted} submitted, ${result.skipped} skipped`,
            description,
            variant: result.skipped > 0 ? 'warning' : 'success',
          });
          // Keep the dialog open when rows were skipped so the user
          // can correct and resubmit without re-uploading everything.
          if (result.skipped === 0) {
            setBulkOpen(false);
            setBulkCsv('');
          }
        },
        onError(error) {
          addToast({ title: 'Bulk upload failed', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      {/* Single reading entry */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Submit Reading</CardTitle>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Bulk CSV Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 min-w-[200px]">
              <Label>Meter</Label>
              <Select value={selectedMeterId} onChange={(e) => setSelectedMeterId(e.target.value)}>
                <option value="">Select meter</option>
                {meters
                  .filter((m) => m.is_active)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.meter_number} ({m.unit_number ?? m.meter_type})
                    </option>
                  ))}
              </Select>
            </div>
            <div className="space-y-2 w-32">
              <Label>Reading Value</Label>
              <Input type="number" value={readingValue} onChange={(e) => setReadingValue(e.target.value)} placeholder="e.g. 1250" />
            </div>
            <div className="space-y-2 w-40">
              <Label>Date</Label>
              <Input type="date" value={readingDate} onChange={(e) => setReadingDate(e.target.value)} />
            </div>
            <Button disabled={submitMutation.isPending} onClick={handleSubmitReading}>
              {submitMutation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Readings history for selected meter */}
      {selectedMeterId && (
        <Card>
          <CardHeader>
            <CardTitle>Reading History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reading</TableHead>
                  <TableHead>Previous</TableHead>
                  <TableHead>Consumption</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readingsQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : readings.length > 0 ? (
                  readings.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.reading_date)}</TableCell>
                      <TableCell className="font-mono">{Number(r.reading_value)}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {r.previous_reading !== null ? Number(r.previous_reading) : '—'}
                      </TableCell>
                      <TableCell>
                        {r.consumption !== null ? (
                          <Badge variant="default">{Number(r.consumption)} units</Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No readings for this meter
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bulk upload dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk CSV Upload</DialogTitle>
            <DialogDescription>
              Paste CSV data with columns: meter_number, reading_value, reading_date (YYYY-MM-DD)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              rows={10}
              placeholder={`meter_number,reading_value,reading_date\nWM-101,1250,${today()}\nEM-201,4530,${today()}`}
              value={bulkCsv}
              onChange={(e) => setBulkCsv(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button disabled={bulkMutation.isPending} onClick={handleBulkUpload}>
              {bulkMutation.isPending ? 'Uploading...' : 'Upload Readings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bills Tab
// ---------------------------------------------------------------------------

function BillsTab(): ReactNode {
  const { addToast } = useToast();
  const PAGE_SIZE = 20;
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate dialog
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcType, setCalcType] = useState<'water' | 'electricity' | 'gas'>('water');
  const [calcFrom, setCalcFrom] = useState('');
  const [calcTo, setCalcTo] = useState('');

  // Invoice dialog
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState('');
  const [invoiceLedgerId, setInvoiceLedgerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());

  const billsQuery = useUtilityBills({
    status: statusFilter || undefined,
    meter_type: typeFilter || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });
  const calcMutation = useCalculateBills();
  const invoiceMutation = useBillToInvoice();
  const ledgerQuery = useLedgerAccounts();

  const bills = billsQuery.data?.data ?? [];
  const total = billsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const ledgerAccounts = ledgerQuery.data?.data ?? [];

  function handleCalculate(): void {
    if (!calcFrom || !calcTo) {
      addToast({ title: 'Period dates are required', variant: 'destructive' });
      return;
    }

    calcMutation.mutate(
      { meter_type: calcType, period_from: calcFrom, period_to: calcTo },
      {
        onSuccess(res) {
          addToast({
            title: `${res.data.count} bills calculated`,
            variant: 'success',
          });
          setCalcOpen(false);
        },
        onError(error) {
          addToast({ title: 'Failed to calculate bills', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function handleGenerateInvoice(): void {
    if (!invoiceLedgerId) {
      addToast({ title: 'Select a revenue account', variant: 'destructive' });
      return;
    }

    invoiceMutation.mutate(
      {
        bill_id: selectedBillId,
        ledger_account_id: invoiceLedgerId,
        invoice_date: invoiceDate,
      },
      {
        onSuccess(res) {
          addToast({
            title: `Invoice ${res.data.invoice_number} created`,
            variant: 'success',
          });
          setInvoiceOpen(false);
          setSelectedBillId('');
        },
        onError(error) {
          addToast({ title: 'Failed to create invoice', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Utility Bills</CardTitle>
            <Button onClick={() => setCalcOpen(true)}>
              <Calculator className="mr-2 h-4 w-4" /> Calculate Bills
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">All</option>
                {METER_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="invoiced">Invoiced</option>
                <option value="paid">Paid</option>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Meter</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Consumption</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : bills.length > 0 ? (
                bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {meterTypeIcon(bill.meter_type ?? '')}
                        <span className="capitalize">{bill.meter_type ?? ''}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{bill.meter_number ?? ''}</TableCell>
                    <TableCell>{bill.unit_number ?? ''}</TableCell>
                    <TableCell className="text-xs">
                      {formatDate(bill.period_from)} – {formatDate(bill.period_to)}
                    </TableCell>
                    <TableCell>{Number(bill.consumption)} units</TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(bill.amount))}</TableCell>
                    <TableCell>
                      <Badge variant={billStatusVariant(bill.status)}>{bill.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {bill.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            setSelectedBillId(bill.id);
                            setInvoiceOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No bills found. Calculate bills from meter readings.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculate bills dialog */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Calculate Bills</DialogTitle>
            <DialogDescription>
              Generate utility bills from meter readings for a period
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Meter Type</Label>
              <Select value={calcType} onChange={(e) => setCalcType(e.target.value as 'water' | 'electricity' | 'gas')}>
                {METER_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period From</Label>
                <Input type="date" value={calcFrom} onChange={(e) => setCalcFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Period To</Label>
                <Input type="date" value={calcTo} onChange={(e) => setCalcTo(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button disabled={calcMutation.isPending} onClick={handleCalculate}>
              {calcMutation.isPending ? 'Calculating...' : 'Calculate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill to invoice dialog */}
      <Dialog open={invoiceOpen} onOpenChange={(open) => { setInvoiceOpen(open); if (!open) setSelectedBillId(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>
              Create an invoice from this utility bill
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Revenue Account</Label>
              <Select value={invoiceLedgerId} onChange={(e) => setInvoiceLedgerId(e.target.value)}>
                <option value="">Select account</option>
                {ledgerAccounts.map((a: { id: string; name: string; code: string }) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button disabled={invoiceMutation.isPending} onClick={handleGenerateInvoice}>
              {invoiceMutation.isPending ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
