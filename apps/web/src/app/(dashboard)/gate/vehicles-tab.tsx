'use client';

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { AlertTriangle, Car, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePager } from '@/components/data-table/data-table-pager';
import { useToast } from '@/components/ui/toast';
import { useAnprLogs, useAnprScan, useGates, useUnrecognizedVehicles } from '@/hooks';
import type { AnprLog, UnrecognizedVehicle } from '@/hooks/use-gate';
import { GATE_LIST_PAGE_SIZE } from './gate-lists';

const IST_TZ = 'Asia/Kolkata';
const MAX_OCR_BYTES = 10 * 1024 * 1024;

function formatDateTime(instant: string | null | undefined): string {
  if (!instant) return '-';
  const at = new Date(instant);
  const day = at.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: IST_TZ });
  const time = at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: IST_TZ });
  return `${day} ${time}`;
}

/** "B-101", "101" or "-" for a log row's matched unit. */
export function unitLabel(log: Pick<AnprLog, 'block' | 'unit_number'>): string {
  if (!log.unit_number) return '-';
  return log.block ? `${log.block}-${log.unit_number}` : log.unit_number;
}

function UnrecognizedCard({ vehicles }: { vehicles: UnrecognizedVehicle[] }): ReactNode {
  if (vehicles.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Unrecognized Vehicles ({vehicles.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="space-y-1 rounded-md border p-3">
              <p className="font-mono text-sm font-bold">{vehicle.vehicle_number}</p>
              <p className="text-xs text-muted-foreground">{vehicle.gate_name ?? '-'}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(vehicle.logged_at)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Admin-panel manual plate scan: guards scan from the app; this tests the
// recognition with a photo and logs the read like a guard's.
function AnprScanCard(): ReactNode {
  const { addToast } = useToast();
  const scan = useAnprScan();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [direction, setDirection] = useState<'entry' | 'exit'>('entry');

  async function onFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_OCR_BYTES) {
      addToast({ title: 'Photo too large', description: 'Max 10 MiB for AI scanning.', variant: 'destructive' });
      return;
    }
    try {
      const result = await scan.mutateAsync({ file, direction });
      const found = result.plate_number !== 'NOT_FOUND';
      addToast({
        title: found ? `Plate: ${result.plate_number}` : 'No plate found in image',
        description: `${result.is_recognized ? 'Matched a registered vehicle' : 'Unrecognized'} · ${Math.round(result.confidence * 100)}% confidence · logged as ${direction}`,
        variant: !found ? 'destructive' : result.is_recognized ? 'success' : 'default',
      });
    } catch (err) {
      addToast({ title: 'Scan failed', description: (err as Error).message ?? 'Try again.', variant: 'destructive' });
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 py-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <div className="min-w-[220px] flex-1">
          <p className="text-sm font-medium">Test ANPR with AI</p>
          <p className="text-xs text-muted-foreground">Upload a photo of a vehicle plate. The read is logged and shows in the table below.</p>
        </div>
        <Select aria-label="Scan direction" value={direction} onChange={(e) => setDirection(e.target.value as 'entry' | 'exit')} className="w-28">
          <option value="entry">Entry</option>
          <option value="exit">Exit</option>
        </Select>
        <Button type="button" variant="outline" size="sm" disabled={scan.isPending} onClick={() => fileInput.current?.click()}>
          {scan.isPending ? 'Scanning…' : 'Upload plate photo'}
        </Button>
        <input ref={fileInput} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={onFile} />
      </CardContent>
    </Card>
  );
}

function LogRow({ log }: { log: AnprLog }): ReactNode {
  const entry = log.direction === 'entry';
  return (
    <TableRow>
      <TableCell className="font-mono font-medium">{log.vehicle_number}</TableCell>
      <TableCell>{log.gate_name ?? '-'}</TableCell>
      <TableCell>
        <Badge variant={entry ? 'success' : 'secondary'}>{entry ? 'Entry' : 'Exit'}</Badge>
      </TableCell>
      <TableCell>{log.is_recognized ? <Badge variant="success">Yes</Badge> : <Badge variant="destructive">No</Badge>}</TableCell>
      <TableCell className="text-muted-foreground">{unitLabel(log)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(log.logged_at)}</TableCell>
    </TableRow>
  );
}

function LogRows({ logs, loading }: { logs: AnprLog[]; loading: boolean }): ReactNode {
  if (loading) {
    return Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: 6 }).map((__, j) => (
          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
        ))}
      </TableRow>
    ));
  }
  if (logs.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No vehicle logs found for the selected filters.</TableCell>
      </TableRow>
    );
  }
  return logs.map((log) => <LogRow key={log.id} log={log} />);
}

/**
 * /gate › Vehicles: the camera plate log under the API's own field names
 * (`vehicle_number`, `logged_at`, `entry` / `exit`). The API filters one
 * day (`date`), a gate and recognized; the list pages 25 at a time.
 */
export function VehiclesTab(): ReactNode {
  const [date, setDate] = useState('');
  const [gateId, setGateId] = useState('');
  const [recognized, setRecognized] = useState('');
  const [page, setPage] = useState(1);
  const gates = useGates().data ?? [];
  const logsQuery = useAnprLogs({
    gate_id: gateId || undefined,
    date: date || undefined,
    is_recognized: recognized === '' ? undefined : recognized === 'true',
    page,
    limit: GATE_LIST_PAGE_SIZE,
  });
  const unrecognized = useUnrecognizedVehicles().data ?? [];
  const logs = logsQuery.data?.data ?? [];
  const total = logsQuery.data?.total ?? 0;
  const change = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };

  return (
    <>
      <UnrecognizedCard vehicles={unrecognized} />
      <AnprScanCard />
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Entry/Exit Log
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input type="date" aria-label="Log date" value={date} onChange={(e) => change(setDate)(e.target.value)} className="w-40" />
              <Select aria-label="Log gate" value={gateId} onChange={(e) => change(setGateId)(e.target.value)} className="w-40">
                <option value="">All gates</option>
                {gates.map((gate) => (
                  <option key={gate.id} value={gate.id}>{gate.name}</option>
                ))}
              </Select>
              <Select aria-label="Recognized" value={recognized} onChange={(e) => change(setRecognized)(e.target.value)} className="w-36">
                <option value="">All</option>
                <option value="true">Recognized</option>
                <option value="false">Unrecognized</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate Number</TableHead>
                <TableHead>Gate</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Recognized</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Logged At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <LogRows logs={logs} loading={logsQuery.isLoading} />
            </TableBody>
          </Table>
          {total > 0 && (
            <div className="mt-4">
              <DataTablePager page={page} pageSize={GATE_LIST_PAGE_SIZE} total={total} pageSizeOptions={[GATE_LIST_PAGE_SIZE]} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
