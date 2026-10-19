'use client';

import { type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { formatCurrency } from '@/lib/utils';
import { blankLine, entryTotals, type EntryLine } from './journal-lines';

type Side = 'debit' | 'credit';

const sideOf = (line: EntryLine): Side => line.side ?? (line.credit.trim() !== '' ? 'credit' : 'debit');
const amountOf = (line: EntryLine): string => (sideOf(line) === 'credit' ? line.credit : line.debit);
const withSide = (line: EntryLine, side: Side, value = amountOf(line)): EntryLine => ({
  ...line,
  side,
  debit: side === 'debit' ? value : '',
  credit: side === 'credit' ? value : '',
});

export const sideLine = (side: Side): EntryLine => withSide(blankLine(), side, '');

/** Today's dialog lines: a Dr/Cr choice, an account and an amount per line. */
export function SideLinesEditor({ lines, onChange }: { lines: readonly EntryLine[]; onChange: (lines: EntryLine[]) => void }): ReactNode {
  const totals = entryTotals(lines);
  const balanced = totals.difference === 0 && totals.debit > 0;
  const replace = (key: string, next: EntryLine) => onChange(lines.map((line) => (line.key === key ? next : line)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Lines</Label>
        <div className="flex items-center gap-2">
          {(['debit', 'credit'] as const).map((side) => (
            <Button key={side} type="button" variant="outline" size="sm" onClick={() => onChange([...lines, sideLine(side)])}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {side === 'debit' ? 'Debit' : 'Credit'}
            </Button>
          ))}
        </div>
      </div>
      {lines.map((line) => (
        <div key={line.key} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
          <select
            aria-label="Debit or credit"
            value={sideOf(line)}
            onChange={(e) => replace(line.key, withSide(line, e.target.value === 'credit' ? 'credit' : 'debit'))}
            className="h-9 w-20 rounded-md border border-input bg-background px-2 text-xs font-medium uppercase"
          >
            <option value="debit">Dr</option>
            <option value="credit">Cr</option>
          </select>
          <div className="flex-1">
            <AccountSearchSelect value={line.ledger_account_id} onChange={(id) => replace(line.key, { ...line, ledger_account_id: id })} placeholder="Pick account…" />
          </div>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            aria-label="Amount"
            value={amountOf(line)}
            onChange={(e) => replace(line.key, withSide(line, sideOf(line), e.target.value))}
            className="w-32 text-right tabular-nums"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={lines.length <= 2}
            onClick={() => onChange(lines.filter((other) => other.key !== line.key))}
            title={lines.length <= 2 ? 'Need at least 2 lines' : 'Remove line'}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-end gap-6 rounded-md border bg-muted/40 px-3 py-2 text-sm tabular-nums">
        <span>
          <span className="text-muted-foreground">Total Dr</span>: <strong>{formatCurrency(totals.debit)}</strong>
        </span>
        <span>
          <span className="text-muted-foreground">Total Cr</span>: <strong>{formatCurrency(totals.credit)}</strong>
        </span>
        <span className={balanced ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
          {balanced ? 'Balanced ✓' : `Off by ${formatCurrency(Math.abs(totals.difference))}`}
        </span>
      </div>
    </div>
  );
}
