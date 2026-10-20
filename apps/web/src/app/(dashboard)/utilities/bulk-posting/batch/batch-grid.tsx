'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BatchGridMeter, BatchRowOutcome } from '@/hooks/use-utility-batch-post';
import { blockUnitLabel } from '../../../units/approved/unit-labels';
import type { GridEntry } from './batch-rows';

interface BatchGridProps {
  meters: readonly BatchGridMeter[];
  entries: Readonly<Record<string, GridEntry>>;
  outcomes: Readonly<Record<string, BatchRowOutcome>>;
  invalid: Readonly<Record<string, string>>;
  /** Opening Reading is typed only when the meter rule does not memorize readings. */
  memorize: boolean;
  defaultDate: string;
  disabled: boolean;
  onChange: (meterId: string, patch: Partial<GridEntry>) => void;
}

function RowResult({ outcome, invalid }: { outcome?: BatchRowOutcome; invalid?: string }): ReactNode {
  const problem = invalid ?? outcome?.errors.join('; ');
  if (problem) return <span className="text-destructive">{problem}</span>;
  if (outcome?.bill_id) return <span className="text-success">Posted</span>;
  return null;
}

/**
 * UTIL-15 grid: one row per meter of the block — Unit · Meter No · Opening
 * Reading · Closing Reading · Reading Date · Consumption · Amount · Comment
 * — with the server's answer (Preview or Post) on each row.
 */
export function BatchGrid({ meters, entries, outcomes, invalid, memorize, defaultDate, disabled, onChange }: BatchGridProps): ReactNode {
  return (
    <Table aria-label="Invoices in Batch">
      <TableHeader>
        <TableRow>
          <TableHead>Unit</TableHead>
          <TableHead>Meter No</TableHead>
          <TableHead>Opening Reading</TableHead>
          <TableHead>Closing Reading</TableHead>
          <TableHead>Reading Date</TableHead>
          <TableHead className="text-right">Consumption</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Comment</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {meters.map((meter) => {
          const entry = entries[meter.meter_id] ?? { opening: '', closing: '', date: defaultDate, comment: '' };
          const outcome = outcomes[meter.meter_id];
          const label = `${meter.meter_number}`;
          return (
            <TableRow key={meter.meter_id}>
              <TableCell>{blockUnitLabel({ block: meter.block, unit_number: meter.unit_number })}</TableCell>
              <TableCell>{meter.meter_number}</TableCell>
              <TableCell>
                {memorize ? (
                  <span title="Memorize Units is on: the period opens on the last reading">{outcome?.opening_reading ?? meter.last_reading_value ?? '—'}</span>
                ) : (
                  <Input aria-label={`Opening Reading, ${label}`} inputMode="decimal" className="w-28" disabled={disabled} value={entry.opening} onChange={(e) => onChange(meter.meter_id, { opening: e.target.value })} />
                )}
              </TableCell>
              <TableCell>
                <Input aria-label={`Closing Reading, ${label}`} inputMode="decimal" className="w-28" disabled={disabled} value={entry.closing} onChange={(e) => onChange(meter.meter_id, { closing: e.target.value })} />
              </TableCell>
              <TableCell>
                <Input aria-label={`Reading Date, ${label}`} type="date" className="w-40" disabled={disabled} value={entry.date} onChange={(e) => onChange(meter.meter_id, { date: e.target.value })} />
              </TableCell>
              <TableCell className="text-right">{outcome?.consumption ?? ''}</TableCell>
              <TableCell className="text-right">{outcome?.amount ?? ''}</TableCell>
              <TableCell>
                <Input aria-label={`Comment, ${label}`} className="w-40" disabled={disabled} value={entry.comment} onChange={(e) => onChange(meter.meter_id, { comment: e.target.value })} />
              </TableCell>
              <TableCell>
                <RowResult outcome={outcome} invalid={invalid[meter.meter_id]} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
