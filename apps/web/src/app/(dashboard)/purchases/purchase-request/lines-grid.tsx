'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ExpenseHeadSummary } from '@/hooks/use-purchase-requests';
import { GST_TYPE_LABELS, rupees, type GstType } from '@/lib/gst-lines';
import { amountsOf, type LineValues } from './request-state';

const HEADERS = [
  'Sl.No', 'Expense Head', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Taxable Amount', 'GST Type', 'GST Rate',
  'CGST', 'SGST', 'IGST', 'Line Total',
];

interface Props {
  lines: readonly LineValues[];
  heads: readonly ExpenseHeadSummary[];
  rates: readonly number[];
  readOnly: boolean;
  errors?: Record<number, string>;
  onChange: (key: number, changes: Partial<LineValues>) => void;
  onRemove: (key: number) => void;
}

const nativeSelect =
  'h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

function headLabel(heads: readonly ExpenseHeadSummary[], id: string): string {
  const head = heads.find((entry) => entry.ledger_account_id === id);
  return head ? `${head.code} ${head.name}` : '—';
}

function LineRow({ line, index, props }: { line: LineValues; index: number; props: Props }): ReactNode {
  const amounts = amountsOf(line);
  const set = (changes: Partial<LineValues>) => props.onChange(line.key, changes);
  const label = (field: string) => `Line ${index + 1} ${field}`;
  return (
    <>
      <TableRow>
        <TableCell>{index + 1}</TableCell>
        <TableCell className="min-w-[160px]">{headLabel(props.heads, line.ledger_account_id)}</TableCell>
        <TableCell>
          <Input aria-label={label('description')} className="h-8 min-w-[140px]" value={line.description} disabled={props.readOnly} onChange={(e) => set({ description: e.target.value })} />
        </TableCell>
        <TableCell>
          <Input aria-label={label('HSN/SAC')} className="h-8 w-24" inputMode="numeric" maxLength={8} value={line.hsn_sac} disabled={props.readOnly} onChange={(e) => set({ hsn_sac: e.target.value })} />
        </TableCell>
        <TableCell>
          <Input aria-label={label('quantity')} className="h-8 w-20" inputMode="decimal" value={line.quantity} disabled={props.readOnly} onChange={(e) => set({ quantity: e.target.value })} />
        </TableCell>
        <TableCell>
          <Input aria-label={label('rate')} className="h-8 w-28" inputMode="decimal" value={line.unit_rate} disabled={props.readOnly} onChange={(e) => set({ unit_rate: e.target.value })} />
        </TableCell>
        <TableCell className="tabular-nums">{rupees(amounts.taxable)}</TableCell>
        <TableCell>
          <select
            aria-label={label('GST type')}
            className={nativeSelect}
            value={line.gst_type}
            disabled={props.readOnly}
            onChange={(e) => {
              const gstType = e.target.value as GstType;
              set({ gst_type: gstType, ...(gstType === 'none' ? { gst_rate: '0' } : {}) });
            }}
          >
            {(Object.keys(GST_TYPE_LABELS) as GstType[]).map((type) => (
              <option key={type} value={type}>
                {GST_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </TableCell>
        <TableCell>
          <select
            aria-label={label('GST rate')}
            className={nativeSelect}
            value={line.gst_rate}
            disabled={props.readOnly || line.gst_type === 'none'}
            onChange={(e) => set({ gst_rate: e.target.value })}
          >
            {(line.gst_type === 'none' ? [0] : props.rates).map((rate) => (
              <option key={rate} value={String(rate)}>
                {rate}%
              </option>
            ))}
          </select>
        </TableCell>
        <TableCell className="tabular-nums">{rupees(amounts.cgst)}</TableCell>
        <TableCell className="tabular-nums">{rupees(amounts.sgst)}</TableCell>
        <TableCell className="tabular-nums">{rupees(amounts.igst)}</TableCell>
        <TableCell className="tabular-nums font-medium">{rupees(amounts.total)}</TableCell>
        {!props.readOnly && (
          <TableCell>
            <Button type="button" size="sm" variant="ghost" aria-label={`Remove line ${index + 1}`} onClick={() => props.onRemove(line.key)}>
              <X className="h-4 w-4" />
            </Button>
          </TableCell>
        )}
      </TableRow>
      {props.errors?.[line.key] && (
        <TableRow>
          <TableCell colSpan={HEADERS.length + 1} className="py-1 text-xs text-destructive">
            Line {index + 1}: {props.errors[line.key]}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/** The request's lines: one per expense head, each with its own GST (EXP-S6). */
export function LinesGrid(props: Props): ReactNode {
  return (
    <div className="overflow-x-auto">
      <Table aria-label="Lines">
        <TableHeader>
          <TableRow>
            {HEADERS.map((header) => (
              <TableHead key={header} className="whitespace-nowrap">
                {header}
              </TableHead>
            ))}
            {!props.readOnly && <TableHead>Remove</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.lines.map((line, index) => (
            <LineRow key={line.key} line={line} index={index} props={props} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
