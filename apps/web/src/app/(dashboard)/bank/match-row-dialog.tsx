'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useManualMatchRow, useReconciliation } from '@/hooks';
import type { ReconciliationRow } from '@/hooks/use-bank';
import { friendlyError } from '@/lib/api-error';
import { formatCurrency, formatDate } from '@/lib/utils';

/** How far either side of the statement row's date to look for the book entry. */
const SEARCH_DAYS = 10;

interface StatementRowForMatch {
  id: string;
  transaction_date: string;
  description: string;
  debit: number;
  credit: number;
}

const DAY_MS = 86_400_000;

function shiftDate(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

const dayGap = (a: string, b: string): number =>
  Math.abs(Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS));

/**
 * Unreconciled book lines a statement row could be matched to: in the row's
 * direction (a deposit is money in, a withdrawal money out), lines of the same
 * amount first, then the nearest in date.
 */
export function candidateLines(
  lines: readonly ReconciliationRow[],
  row: Pick<StatementRowForMatch, 'debit' | 'credit' | 'transaction_date'>,
): ReconciliationRow[] {
  const deposit = Number(row.credit) > 0;
  const wanted = deposit ? Number(row.credit) : Number(row.debit);
  return lines
    .filter((line) => !line.is_reconciled && (deposit ? line.amount > 0 : line.amount < 0))
    .map((line) => ({
      line,
      sameAmount: Math.abs(Math.abs(line.amount) - wanted) < 0.01,
      gap: dayGap(line.entry_date, row.transaction_date),
    }))
    .sort((a, b) => Number(b.sameAmount) - Number(a.sameAmount) || a.gap - b.gap)
    .map((entry) => entry.line);
}

interface MatchRowDialogProps {
  row: StatementRowForMatch;
  accountId: string;
  onClose: () => void;
}

/**
 * Picks the book entry an imported statement row belongs to (BANK-02).
 * Matching reconciles that entry's line at the statement row's date.
 */
export function MatchRowDialog({ row, accountId, onClose }: MatchRowDialogProps): ReactNode {
  const { addToast } = useToast();
  const [chosen, setChosen] = useState('');
  const from = shiftDate(row.transaction_date, -SEARCH_DAYS);
  const to = shiftDate(row.transaction_date, SEARCH_DAYS);
  const register = useReconciliation(accountId, from, to);
  const match = useManualMatchRow();
  const lines = useMemo(() => candidateLines(register.data?.rows ?? [], row), [register.data, row]);

  function handleMatch(): void {
    const line = lines.find((l) => l.id === chosen);
    if (!line) return;
    match.mutate(
      { row_id: row.id, journal_entry_id: line.journal_entry_id },
      {
        onSuccess() {
          addToast({ title: 'Row matched', description: 'The entry is reconciled at the statement date.', variant: 'success' });
          onClose();
        },
        onError(error) {
          addToast({ title: 'Could not match the row', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Match statement row</DialogTitle>
          <DialogDescription>
            {formatDate(row.transaction_date)} · {row.description} ·{' '}
            {Number(row.credit) > 0 ? `deposit ${formatCurrency(Number(row.credit))}` : `withdrawal ${formatCurrency(Number(row.debit))}`}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto py-2">
          {register.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No unreconciled lines within {SEARCH_DAYS} days of this row.
            </p>
          ) : (
            lines.map((line) => (
              <label key={line.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-2 text-sm">
                <input
                  type="radio"
                  name="match-line"
                  checked={chosen === line.id}
                  onChange={() => setChosen(line.id)}
                  aria-label={`${line.document_no} ${line.narration}`}
                />
                <span className="w-24 text-muted-foreground">{formatDate(line.entry_date)}</span>
                <span className="w-28 font-mono text-xs">{line.document_no}</span>
                <span className="flex-1">{line.narration}</span>
                <span className="font-medium">{formatCurrency(Math.abs(line.amount))}</span>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleMatch} disabled={!chosen || match.isPending}>
            Match
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
