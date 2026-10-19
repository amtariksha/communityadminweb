'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { BillPreview, InvoiceHead } from '@/hooks/use-vendor-bills';
import { emptyRow, isUsed, MAX_ROWS, rowIssue, type InvoiceRow } from './invoice-model';

interface InvoiceLineGridProps {
  rows: InvoiceRow[];
  onChange: (rows: InvoiceRow[]) => void;
  heads: readonly InvoiceHead[];
  rateOptions: readonly number[];
  /** The server's figures for the used rows, in order (preview). */
  computed?: BillPreview['lines'];
}

const COLUMNS = ['Sl.No', 'Expense Head', 'Description', 'HSN/SAC', 'Amount', 'CGST/SGST Rate', 'IGST Rate', 'CGST', 'SGST', 'IGST', ''];

/** The line grid of EXP-S8: seven rows shown, more on demand up to fifty; blank rows are ignored. */
export function InvoiceLineGrid({ rows, onChange, heads, rateOptions, computed = [] }: InvoiceLineGridProps): ReactNode {
  const update = (index: number, patch: Partial<InvoiceRow>): void => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const pickHead = (index: number, headId: string): void => {
    const head = heads.find((h) => h.ledger_account_id === headId);
    update(index, { head: headId, hsnSac: rows[index].hsnSac || head?.hsn_sac || '' });
  };
  let usedIndex = -1;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>{COLUMNS.map((c, i) => <TableHead key={i}>{c}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const server = isUsed(row) ? computed[++usedIndex] : undefined;
              const issue = rowIssue(row);
              const label = `Line ${index + 1}`;
              return (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="min-w-[12rem]">
                    <Select aria-label={`${label} expense head`} value={row.head} onChange={(e) => pickHead(index, e.target.value)}>
                      <option value="">—</option>
                      {heads.map((h) => (
                        <option key={h.ledger_account_id} value={h.ledger_account_id}>{h.code ? `${h.code} ${h.name}` : h.name}</option>
                      ))}
                    </Select>
                    {issue && <p role="alert" className="mt-1 text-xs text-destructive">{issue}</p>}
                  </TableCell>
                  <TableCell><Input aria-label={`${label} description`} maxLength={500} value={row.description} onChange={(e) => update(index, { description: e.target.value })} /></TableCell>
                  <TableCell><Input aria-label={`${label} HSN/SAC`} className="w-24" inputMode="numeric" maxLength={8} value={row.hsnSac} onChange={(e) => update(index, { hsnSac: e.target.value.replace(/\D/g, '') })} /></TableCell>
                  <TableCell><Input aria-label={`${label} amount`} className="w-28" type="number" min="0" step="0.01" value={row.amount} onChange={(e) => update(index, { amount: e.target.value })} /></TableCell>
                  <TableCell><RateSelect label={`${label} CGST/SGST rate`} value={row.cgstSgstRate} options={rateOptions} onChange={(v) => update(index, { cgstSgstRate: v })} /></TableCell>
                  <TableCell><RateSelect label={`${label} IGST rate`} value={row.igstRate} options={rateOptions} onChange={(v) => update(index, { igstRate: v })} /></TableCell>
                  <TableCell className="text-right tabular-nums">{server ? formatCurrency(server.cgst) : ''}</TableCell>
                  <TableCell className="text-right tabular-nums">{server ? formatCurrency(server.sgst) : ''}</TableCell>
                  <TableCell className="text-right tabular-nums">{server ? formatCurrency(server.igst) : ''}</TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => update(index, emptyRow())}>
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {rows.length < MAX_ROWS && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, emptyRow()])}>
          + more lines
        </Button>
      )}
    </div>
  );
}

function RateSelect(props: { label: string; value: string; options: readonly number[]; onChange: (value: string) => void }): ReactNode {
  return (
    <Select aria-label={props.label} className="w-24" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
      <option value="">—</option>
      {props.options.map((rate) => (
        <option key={rate} value={String(rate)}>{rate}%</option>
      ))}
    </Select>
  );
}
