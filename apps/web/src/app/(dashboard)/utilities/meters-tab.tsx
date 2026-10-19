'use client';

import { useState, type ReactNode } from 'react';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { ExportStrip } from '@/components/data-table/export-strip';
import { printableTable, toTsv } from '@/components/data-table/table-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useMeters, useUpdateMeter } from '@/hooks';
import type { Meter } from '@/hooks/use-utilities';
import { formatDate } from '@/lib/utils';
import { AddMeterDialog } from './add-meter-dialog';
import { lastReadingText, METER_TEXT_COLUMNS } from './meter-columns';
import { METER_TYPES, meterTypeIcon, meterTypeLabel } from './utility-ui';

const COLUMN_COUNT = 7;

interface MetersTabProps {
  meterTypeFilter: string;
  setMeterTypeFilter: (value: string) => void;
}

function StateRow({ children, className }: { children: ReactNode; className?: string }): ReactNode {
  return (
    <TableRow>
      <TableCell colSpan={COLUMN_COUNT} className={`py-8 text-center ${className ?? 'text-muted-foreground'}`}>
        {children}
      </TableCell>
    </TableRow>
  );
}

function MeterRow({ meter, onToggle }: { meter: Meter; onToggle: (meter: Meter) => void }): ReactNode {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          {meterTypeIcon(meter.meter_type)}
          <span className="capitalize">{meter.meter_type}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">{meter.meter_number}</TableCell>
      <TableCell>
        {meter.is_common ? <Badge variant="secondary">Common</Badge> : (meter.unit_number ?? meter.unit_id ?? '—')}
      </TableCell>
      <TableCell>
        <Badge variant={meter.is_active ? 'success' : 'secondary'}>{meter.is_active ? 'Active' : 'Inactive'}</Badge>
      </TableCell>
      <TableCell className="text-sm">{lastReadingText(meter)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(meter.created_at)}</TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onToggle(meter)}
          title={meter.is_active ? 'Deactivate' : 'Activate'}
        >
          {meter.is_active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function MeterRows({ query, onToggle }: { query: ReturnType<typeof useMeters>; onToggle: (meter: Meter) => void }): ReactNode {
  if (query.isLoading) {
    return Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
        ))}
      </TableRow>
    ));
  }
  if (query.isError) {
    return (
      <StateRow className="text-destructive">
        Failed to load meters — {(query.error as Error)?.message ?? 'unknown error'}.{' '}
        <Button size="sm" variant="link" className="px-1 text-destructive underline" onClick={() => query.refetch()}>
          Retry
        </Button>
      </StateRow>
    );
  }
  const meters = query.data ?? [];
  if (meters.length === 0) return <StateRow>No meters found. Add meters to start tracking utility consumption.</StateRow>;
  return meters.map((meter) => <MeterRow key={meter.id} meter={meter} onToggle={onToggle} />);
}

export function MetersTab({ meterTypeFilter, setMeterTypeFilter }: MetersTabProps): ReactNode {
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const metersQuery = useMeters({ meter_type: meterTypeFilter || undefined });
  const updateMutation = useUpdateMeter();
  const meters = metersQuery.data ?? [];

  function handleToggleActive(meter: Meter): void {
    updateMutation.mutate(
      { id: meter.id, is_active: !meter.is_active },
      {
        onSuccess() {
          addToast({ title: `Meter ${meter.is_active ? 'deactivated' : 'activated'}`, variant: 'success' });
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
            <Select aria-label="Meter type" value={meterTypeFilter} onChange={(e) => setMeterTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {METER_TYPES.map((t) => (
                <option key={t} value={t}>{meterTypeLabel(t)}</option>
              ))}
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Meter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ExportStrip
          config={{
            path: '/utilities/meters/export',
            params: meterTypeFilter ? { meter_type: meterTypeFilter } : {},
            filename: 'utility-meters',
          }}
          copyText={() => toTsv(METER_TEXT_COLUMNS, meters)}
          printPage={() => printableTable('Utility Meters', METER_TEXT_COLUMNS, meters)}
          rowCount={meters.length}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Meter Number</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Reading</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <MeterRows query={metersQuery} onToggle={handleToggleActive} />
          </TableBody>
        </Table>
      </CardContent>
      <AddMeterDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  );
}
