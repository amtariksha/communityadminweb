'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Plus, Zap, Calculator, FileText, Upload, Trash2, Camera } from 'lucide-react';
import { useOcrMeterReading } from '@/hooks/use-ocr';
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
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useUtilityStats,
  useMeters,
  useSlabs,
  useCreateSlab,
  useDeleteSlab,
  useSubmitReading,
  useSubmitBulkReadings,
  useReadings,
} from '@/hooks';
import type { Meter, Slab } from '@/hooks/use-utilities';
import { MeterConsumptionChart } from '@/components/utilities/meter-consumption-chart';
import { BillsTab } from './bills-tab';
import { MetersTab } from './meters-tab';
import { METER_TYPES, meterTypeIcon, today } from './utility-ui';

// ---------------------------------------------------------------------------
// Tab constants
// ---------------------------------------------------------------------------

type Tab = 'meters' | 'slabs' | 'readings' | 'bills' | 'trends';

const TABS: { key: Tab; label: string }[] = [
  { key: 'meters', label: 'Meters' },
  { key: 'slabs', label: 'Slab Rates' },
  { key: 'readings', label: 'Readings' },
  { key: 'bills', label: 'Bills' },
  { key: 'trends', label: 'Trends' },
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

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Utilities' }]}
        title="Utilities"
        description="Manage metered billing for water, electricity, and gas"
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
      {activeTab === 'trends' && <TrendsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trends Tab (#25) — per-meter consumption chart
// ---------------------------------------------------------------------------

function TrendsTab(): ReactNode {
  const [meterType, setMeterType] = useState('');
  const metersQuery = useMeters({ meter_type: meterType || undefined });
  const [selectedId, setSelectedId] = useState('');

  const meters = metersQuery.data ?? [];
  const selected = meters.find((m) => m.id === selectedId) ?? meters[0] ?? null;

  const meterLabel = (m: Meter): string =>
    `${m.meter_number} · ${m.meter_type}${m.unit_number ? ` · ${m.unit_number}` : m.is_common ? ' · common' : ''}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consumption Trends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="w-40 space-y-1">
            <Label htmlFor="trend-type">Meter type</Label>
            <Select
              id="trend-type"
              value={meterType}
              onChange={(e) => {
                setMeterType(e.target.value);
                setSelectedId('');
              }}
            >
              <option value="">All types</option>
              <option value="water">Water</option>
              <option value="electricity">Electricity</option>
              <option value="gas">Gas</option>
            </Select>
          </div>
          <div className="w-64 space-y-1">
            <Label htmlFor="trend-meter">Meter</Label>
            <Select
              id="trend-meter"
              value={selected?.id ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {meters.length === 0 && <option value="">No meters</option>}
              {meters.map((m) => (
                <option key={m.id} value={m.id}>
                  {meterLabel(m)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {metersQuery.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : selected ? (
          <MeterConsumptionChart meter={selected} />
        ) : (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No meters to chart. Add a meter first.
          </div>
        )}
      </CardContent>
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
          addToast({ title: 'Failed to create slab', description: friendlyError(error), variant: 'destructive' });
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
  // AI scan state — reuses the shared useOcrMeterReading hook.
  const meterFileInputRef = useRef<HTMLInputElement | null>(null);
  const [meterScanConfidence, setMeterScanConfidence] = useState<number | null>(null);
  const [meterScanUnit, setMeterScanUnit] = useState<string | null>(null);
  const ocrMeter = useOcrMeterReading();
  const MAX_OCR_BYTES = 10 * 1024 * 1024;
  const [readingDate, setReadingDate] = useState(today());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCsv, setBulkCsv] = useState('');

  const metersQuery = useMeters();
  const readingsQuery = useReadings(selectedMeterId);
  const submitMutation = useSubmitReading();
  const bulkMutation = useSubmitBulkReadings();

  const meters = metersQuery.data ?? [];
  const readings = readingsQuery.data?.data ?? [];

  async function handleScanMeter(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_OCR_BYTES) {
      addToast({
        title: 'Photo too large',
        description: `Max ${MAX_OCR_BYTES / (1024 * 1024)} MiB for AI reading.`,
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await ocrMeter.mutateAsync(file);
      if (result.reading_value != null) {
        setReadingValue(String(result.reading_value));
      }
      setMeterScanConfidence(result.confidence);
      setMeterScanUnit(result.unit);
      addToast({
        title: result.reading_value != null
          ? `Read: ${result.reading_value}${result.unit ? ` ${result.unit}` : ''}`
          : 'Could not read the meter — enter manually',
        description: `Confidence ${Math.round((result.confidence ?? 0) * 100)}%. Double-check the value.`,
        variant: result.reading_value != null ? 'success' : 'destructive',
      });
    } catch (err) {
      addToast({
        title: 'AI reading failed',
        description:
          (err as Error).message ?? 'Please enter the reading manually.',
        variant: 'destructive',
      });
    }
  }

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
          addToast({ title: 'Failed to submit reading', description: friendlyError(error), variant: 'destructive' });
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
          addToast({ title: 'Bulk upload failed', description: friendlyError(error), variant: 'destructive' });
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
              <div className="flex items-center gap-1">
                <Input type="number" value={readingValue} onChange={(e) => setReadingValue(e.target.value)} placeholder="e.g. 1250" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Photograph the meter (AI-read)"
                  disabled={ocrMeter.isPending}
                  onClick={() => meterFileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={meterFileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleScanMeter}
                />
              </div>
              {meterScanConfidence != null && (
                <p className="text-xs text-muted-foreground">
                  {ocrMeter.isPending ? 'Reading…' : (
                    <>
                      {meterScanUnit && <span>{meterScanUnit} · </span>}
                      <span className={meterScanConfidence >= 0.7 ? 'text-success' : 'text-warning'}>
                        {Math.round(meterScanConfidence * 100)}% confident
                      </span>
                    </>
                  )}
                </p>
              )}
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
