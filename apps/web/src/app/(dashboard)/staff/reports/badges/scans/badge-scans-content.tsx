'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { indiaDateTime } from '@/lib/india-time';
import {
  BADGE_SCAN_PAGE_SIZE,
  useBadgeScans,
  type BadgeScanFilters,
  type BadgeScanResult,
  type BadgeScanRow,
} from '@/hooks/use-staff-badges';

const RESULT_LABELS: Record<BadgeScanResult, string> = {
  found: 'Allowed',
  inactive: 'Not working / expired',
  not_found: 'Unknown QR',
};

/** The guards' badge QR lookups: who, when, at which gate, and what they found. */
export function BadgeScansContent(): ReactNode {
  const [filters, setFilters] = useState<BadgeScanFilters>({ date_from: '', date_to: '', result: '', page: 1 });
  const scans = useBadgeScans(filters);
  const change = (patch: Partial<BadgeScanFilters>) => setFilters((current) => ({ ...current, page: 1, ...patch }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Badge scans</h1>
        <Link href="/staff/reports/badges" className="text-sm text-primary underline">Print badges</Link>
      </div>
      <ScanFilters filters={filters} onChange={change} />
      <ScanResults
        state={scans.data === null ? 'missing' : scans.isError ? 'error' : scans.data ? 'ready' : 'loading'}
        rows={scans.data?.data ?? []}
        total={scans.data?.total ?? 0}
        page={filters.page}
        onPage={(page) => setFilters((current) => ({ ...current, page }))}
      />
    </div>
  );
}

function ScanFilters({ filters, onChange }: { filters: BadgeScanFilters; onChange: (patch: Partial<BadgeScanFilters>) => void }): ReactNode {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="scan-from">From</Label>
        <Input id="scan-from" type="date" value={filters.date_from} onChange={(event) => onChange({ date_from: event.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="scan-to">To</Label>
        <Input id="scan-to" type="date" value={filters.date_to} onChange={(event) => onChange({ date_to: event.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="scan-result">Result</Label>
        <Select id="scan-result" value={filters.result} onChange={(event) => onChange({ result: event.target.value as BadgeScanFilters['result'] })}>
          <option value="">All</option>
          {(Object.keys(RESULT_LABELS) as BadgeScanResult[]).map((key) => <option key={key} value={key}>{RESULT_LABELS[key]}</option>)}
        </Select>
      </div>
    </div>
  );
}

interface ScanResultsProps {
  state: 'loading' | 'missing' | 'error' | 'ready';
  rows: BadgeScanRow[];
  total: number;
  page: number;
  onPage: (page: number) => void;
}

function ScanResults({ state, rows, total, page, onPage }: ScanResultsProps): ReactNode {
  if (state === 'missing') return <p className="text-sm text-muted-foreground">Badge scans are not available yet on this server.</p>;
  if (state === 'error') return <p role="alert" className="text-sm text-destructive">Could not load the badge scans.</p>;
  if (state === 'loading') return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No badge scans match.</p>;
  const pages = Math.max(1, Math.ceil(total / BADGE_SCAN_PAGE_SIZE));
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">When</th>
              <th className="p-2">Guard</th>
              <th className="p-2">Gate</th>
              <th className="p-2">Result</th>
              <th className="p-2">Badge No.</th>
              <th className="p-2">Name</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{indiaDateTime(row.scanned_at)}</td>
                <td className="p-2">{row.scanned_by_name ?? '—'}</td>
                <td className="p-2">{row.gate_name ?? '—'}</td>
                <td className="p-2">{RESULT_LABELS[row.result]}</td>
                <td className="p-2 tabular-nums">{row.badge_no ?? '—'}</td>
                <td className="p-2">{row.holder_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span>{total} scan{total === 1 ? '' : 's'} · page {page} of {pages}</span>
        <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
