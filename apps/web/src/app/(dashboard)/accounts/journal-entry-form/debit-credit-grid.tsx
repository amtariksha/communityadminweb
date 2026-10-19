'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { formatCurrency } from '@/lib/utils';
import { blankLines, entryTotals, type EntryLine } from './journal-lines';

interface GridProps {
  lines: readonly EntryLine[];
  onChange: (lines: EntryLine[]) => void;
}

function AmountInput({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }): ReactNode {
  return (
    <Input
      aria-label={label}
      type="number"
      inputMode="decimal"
      min="0.01"
      step="0.01"
      className="w-36 text-right tabular-nums"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/**
 * The fixed Debit / Credit grid of Create Journal Entry as a page (GL-S6):
 * a line counts once it has an account or an amount; "Add 5 lines" for
 * longer entries; totals and the difference below.
 */
export function DebitCreditGrid({ lines, onChange }: GridProps): ReactNode {
  const totals = entryTotals(lines);
  const update = (key: string, patch: Partial<EntryLine>) =>
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  return (
    <div className="space-y-2">
      <Table aria-label="Journal lines">
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Sl.No</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Debit Amount</TableHead>
            <TableHead className="text-right">Credit Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, index) => (
            <TableRow key={line.key}>
              <TableCell>{index + 1}</TableCell>
              <TableCell className="min-w-72">
                <AccountSearchSelect value={line.ledger_account_id} onChange={(id) => update(line.key, { ledger_account_id: id })} placeholder="Search account…" />
              </TableCell>
              <TableCell className="text-right">
                <AmountInput label={`Debit, line ${index + 1}`} value={line.debit} onChange={(debit) => update(line.key, { debit })} />
              </TableCell>
              <TableCell className="text-right">
                <AmountInput label={`Credit, line ${index + 1}`} value={line.credit} onChange={(credit) => update(line.key, { credit })} />
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-semibold tabular-nums">
            <TableCell colSpan={2} className="text-right">
              Total Debit · Total Credit · Difference
            </TableCell>
            <TableCell className="text-right" data-testid="total-debit">{formatCurrency(totals.debit)}</TableCell>
            <TableCell className="text-right" data-testid="total-credit">{formatCurrency(totals.credit)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Button type="button" variant="link" className="px-0" onClick={() => onChange([...lines, ...blankLines(5)])}>
          Add 5 lines
        </Button>
        <span role="status" className={totals.difference === 0 ? 'text-muted-foreground' : 'font-semibold text-destructive'}>
          Difference: {formatCurrency(Math.abs(totals.difference))}
        </span>
      </div>
    </div>
  );
}
