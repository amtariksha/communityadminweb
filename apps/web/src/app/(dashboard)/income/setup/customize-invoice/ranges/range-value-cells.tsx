'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { TableCell, TableHead } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { RangeFrequency, RangeKind } from '@/hooks/use-billing-documents';
import { todayIST } from '@/lib/date';
import { periodSample, type RangeRowState } from './range-rows';

const FREQUENCIES: ReadonlyArray<[RangeFrequency, string]> = [
  ['monthly', 'Monthly'],
  ['quarterly', 'Quarterly'],
  ['half_yearly', 'Half Yearly'],
  ['yearly', 'Yearly'],
];

const HEADERS: Record<RangeKind, string[]> = {
  footer: ['Footer'],
  prefix: ['Prefix'],
  header_title: ['Title'],
  period: ['Frequency', 'Invoice Period', 'Invoice Period Sample'],
};

export function ValueHeaders({ kind }: { kind: RangeKind }): ReactNode {
  return HEADERS[kind].map((header) => <TableHead key={header}>{header}</TableHead>);
}

interface ValueCellsProps {
  kind: RangeKind;
  row: RangeRowState;
  index: number;
  disabled: boolean;
  change: (patch: Partial<RangeRowState>) => void;
}

function PeriodCells({ row, index, disabled, change }: Omit<ValueCellsProps, 'kind'>): ReactNode {
  const sample = periodSample(row.value, row.frequency, todayIST());
  return (
    <>
      <TableCell>
        <select
          aria-label={`Frequency, row ${index}`}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={row.frequency}
          disabled={disabled}
          onChange={(e) => change({ frequency: e.target.value as RangeFrequency | '' })}
        >
          <option value="">Invoice&apos;s own period</option>
          {FREQUENCIES.map(([value, text]) => (
            <option key={value} value={value}>{text}</option>
          ))}
        </select>
      </TableCell>
      <TableCell>
        <Input
          aria-label={`Invoice Period, row ${index}`}
          maxLength={80}
          placeholder="{from} to {to}"
          value={row.value}
          disabled={disabled}
          onChange={(e) => change({ value: e.target.value })}
        />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{sample || '—'}</TableCell>
    </>
  );
}

/** The value column(s) of a range row: footer lines, prefix, title, or frequency and period wording. */
export function ValueCells({ kind, row, index, disabled, change }: ValueCellsProps): ReactNode {
  if (kind === 'period') return <PeriodCells row={row} index={index} disabled={disabled} change={change} />;
  const name = HEADERS[kind][0];
  return (
    <TableCell className={kind === 'footer' ? 'min-w-[18rem]' : undefined}>
      {kind === 'footer' ? (
        <Textarea
          aria-label={`${name}, row ${index}`}
          rows={3}
          value={row.value}
          disabled={disabled}
          onChange={(e) => change({ value: e.target.value })}
        />
      ) : (
        <Input
          aria-label={`${name}, row ${index}`}
          maxLength={kind === 'prefix' ? 12 : 80}
          value={row.value}
          disabled={disabled}
          onChange={(e) => change({ value: e.target.value })}
        />
      )}
    </TableCell>
  );
}
