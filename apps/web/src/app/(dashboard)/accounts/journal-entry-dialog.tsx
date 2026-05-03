'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { formatCurrency, financialDateBounds, clampDateString } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useCreateJournalEntry, useFinancialYears } from '@/hooks';

// ---------------------------------------------------------------------------
// Manual Journal Entry dialog
// ---------------------------------------------------------------------------
//
// Backend (POST /ledger/journal-entries) has been live for a while — the
// schema (packages/shared/src/schemas/finance.ts) requires a balanced
// list of >= 2 lines, narration, entry_date, and a financial_year_id.
// This component is the missing UI: pick FY, narration, date, then
// add as many DR/CR lines as the operator wants. The submit button
// stays disabled until the lines balance (Σdr === Σcr) and at least
// two lines are present.
//
// Use cases this unblocks for the accountant:
//   - Transfer offset balance from any account to any account
//     (e.g. correct a misposting)
//   - Year-end accruals / prepaid expense reclassifications
//   - Opening-balance adjustments for accounts that don't fit the
//     "set opening balance via setOpeningBalance" mould
//   - Any bookkeeping that doesn't fit the invoice / receipt /
//     vendor-bill / vendor-payment templates
//
// The same data flows out to Tally as a JOURNAL voucher on export.
// ---------------------------------------------------------------------------

interface JournalLine {
  id: string; // local-only, for stable React keys when re-ordering
  ledger_account_id: string;
  side: 'debit' | 'credit';
  amount: string; // string so partial input doesn't fight Number()
}

const newLine = (): JournalLine => ({
  id: `line-${Math.random().toString(36).slice(2, 10)}`,
  ledger_account_id: '',
  side: 'debit',
  amount: '',
});

export interface JournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JournalEntryDialog({
  open,
  onOpenChange,
}: JournalEntryDialogProps): ReactNode {
  const { addToast } = useToast();
  const dateBounds = financialDateBounds();

  const fyQuery = useFinancialYears();
  const createJE = useCreateJournalEntry();

  // Auto-pick the current FY if we have it. Otherwise fall back to
  // the first FY in the list. The form blocks submit if neither
  // resolves (no FY configured at all → operator must set one up
  // first under Settings > Financial Years).
  const fys = fyQuery.data ?? [];
  const defaultFyId = useMemo(() => {
    return fys.find((f) => f.is_current)?.id ?? fys[0]?.id ?? '';
  }, [fys]);

  const [financialYearId, setFinancialYearId] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [narration, setNarration] = useState('');
  // Phase C round-trip — operator-picked Tally voucher type. Defaults
  // to "Journal" which is what Tally uses for free-form bookkeeping
  // entries. The other options match what Tally exposes natively;
  // the export emits this verbatim as VCHTYPE so the JE round-trips
  // back into Tally as the right kind of voucher.
  const [voucherType, setVoucherType] = useState<string>('Journal');
  // Two lines is the minimum (per backend schema); seed with one
  // debit + one credit so the operator sees the balanced template
  // immediately.
  const [lines, setLines] = useState<JournalLine[]>(() => [
    { ...newLine(), side: 'debit' },
    { ...newLine(), side: 'credit' },
  ]);

  // Reset the form every time the dialog (re)opens. Without this a
  // stale FY/date/lines from the previous entry leaks in.
  useEffect(() => {
    if (!open) return;
    setFinancialYearId(defaultFyId);
    setEntryDate(new Date().toISOString().slice(0, 10));
    setNarration('');
    setVoucherType('Journal');
    setLines([
      { ...newLine(), side: 'debit' },
      { ...newLine(), side: 'credit' },
    ]);
  }, [open, defaultFyId]);

  function updateLine(idx: number, patch: Partial<JournalLine>): void {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    );
  }
  function removeLine(idx: number): void {
    setLines((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));
  }
  function addLine(side: 'debit' | 'credit'): void {
    setLines((prev) => [...prev, { ...newLine(), side }]);
  }

  // Live totals — also drives the balanced-lines check.
  const totalDebit = lines
    .filter((l) => l.side === 'debit')
    .reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
  const totalCredit = lines
    .filter((l) => l.side === 'credit')
    .reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
  const hasMissingAccount = lines.some((l) => !l.ledger_account_id);
  const canSubmit =
    !!financialYearId &&
    !!entryDate &&
    narration.trim().length > 0 &&
    lines.length >= 2 &&
    isBalanced &&
    !hasMissingAccount &&
    !createJE.isPending;

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!canSubmit) return;
    // Backend expects per-line { ledger_account_id, debit, credit }
    // with one of debit/credit non-zero. Translate the side toggle
    // into the right shape.
    const payload = {
      financial_year_id: financialYearId,
      entry_date: entryDate,
      narration: narration.trim(),
      voucher_type_name: voucherType,
      lines: lines.map((l) => ({
        ledger_account_id: l.ledger_account_id,
        debit: l.side === 'debit' ? Number(l.amount) || 0 : 0,
        credit: l.side === 'credit' ? Number(l.amount) || 0 : 0,
      })),
    };
    createJE.mutate(payload, {
      onSuccess() {
        addToast({
          title: `Journal entry posted — ${formatCurrency(totalDebit)}`,
          variant: 'success',
        });
        onOpenChange(false);
      },
      onError(err) {
        addToast({
          title: 'Failed to post journal entry',
          description: friendlyError(err),
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>
              Free-form posting against any two (or more) ledger accounts.
              Lines must balance: Σ Debits = Σ Credits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Top row — date + FY */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="je-date">Date</Label>
                <Input
                  id="je-date"
                  type="date"
                  required
                  min={dateBounds.min}
                  max={dateBounds.max}
                  value={entryDate}
                  onChange={(e) =>
                    setEntryDate(
                      clampDateString(e.target.value, dateBounds.min, dateBounds.max),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="je-fy">Financial year</Label>
                <select
                  id="je-fy"
                  required
                  value={financialYearId}
                  onChange={(e) => setFinancialYearId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Pick FY</option>
                  {fys.map((fy) => (
                    <option key={fy.id} value={fy.id}>
                      {fy.label}
                      {fy.is_current ? ' (current)' : ''}
                      {fy.is_frozen ? ' — frozen' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tally voucher type — Phase C round-trip. Defaults to
                "Journal" (free-form bookkeeping), but the operator can
                pick "Contra" for bank-to-bank transfers,
                "Debit Note" for vendor returns / payable adjustments,
                etc. The export emits VCHTYPE = this value, so the JE
                round-trips back into Tally as the right voucher kind. */}
            <div className="space-y-2">
              <Label htmlFor="je-voucher-type">
                Voucher type{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (controls how Tally classifies this entry on export)
                </span>
              </Label>
              <select
                id="je-voucher-type"
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="Journal">Journal — free-form bookkeeping</option>
                <option value="Contra">Contra — bank ↔ bank / cash ↔ bank</option>
                <option value="Payment">Payment — outgoing cash</option>
                <option value="Receipt">Receipt — incoming cash</option>
                <option value="Credit Note">Credit Note — sales reversal</option>
                <option value="Debit Note">Debit Note — vendor return</option>
                <option value="Sales">Sales</option>
                <option value="Purchase">Purchase</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="je-narration">Narration</Label>
              <Textarea
                id="je-narration"
                required
                placeholder="e.g. Adjustment — clubhouse rental income mis-posted to membership"
                value={narration}
                maxLength={1000}
                onChange={(e) => setNarration(e.target.value)}
                rows={2}
              />
            </div>

            {/* Lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lines</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addLine('debit')}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Debit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addLine('credit')}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Credit
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div
                    key={line.id}
                    className="flex items-center gap-2 rounded-md border bg-muted/30 p-2"
                  >
                    <select
                      value={line.side}
                      onChange={(e) =>
                        updateLine(idx, {
                          side: e.target.value === 'credit' ? 'credit' : 'debit',
                        })
                      }
                      className="h-9 w-20 rounded-md border border-input bg-background px-2 text-xs font-medium uppercase"
                    >
                      <option value="debit">Dr</option>
                      <option value="credit">Cr</option>
                    </select>
                    <div className="flex-1">
                      <AccountSearchSelect
                        value={line.ledger_account_id}
                        onChange={(id) => updateLine(idx, { ledger_account_id: id })}
                        placeholder="Pick account…"
                      />
                    </div>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={line.amount}
                      onChange={(e) => updateLine(idx, { amount: e.target.value })}
                      className="w-32 text-right tabular-nums"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={lines.length <= 2}
                      onClick={() => removeLine(idx)}
                      title={lines.length <= 2 ? 'Need at least 2 lines' : 'Remove line'}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Live totals */}
              <div className="flex items-center justify-end gap-6 rounded-md border bg-muted/40 px-3 py-2 text-sm tabular-nums">
                <span>
                  <span className="text-muted-foreground">Total Dr</span>:{' '}
                  <strong>{formatCurrency(totalDebit)}</strong>
                </span>
                <span>
                  <span className="text-muted-foreground">Total Cr</span>:{' '}
                  <strong>{formatCurrency(totalCredit)}</strong>
                </span>
                <span
                  className={
                    isBalanced
                      ? 'font-semibold text-green-600'
                      : 'font-semibold text-destructive'
                  }
                >
                  {isBalanced ? 'Balanced ✓' : `Off by ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!canSubmit}>
              {createJE.isPending ? 'Posting…' : 'Post entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
