'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { useToast } from '@/components/ui/toast';
import { useBulkCorrect, useCorrectableEntries, type CorrectableEntry, type CorrectableQuery, type Correction } from '@/hooks/use-bulk-corrections';
import { ApiError, friendlyError } from '@/lib/api-error';
import { currentFinancialYear } from '@/lib/date';
import { formatCurrency } from '@/lib/utils';

interface EditLine {
  ledger_account_id: string;
  debit: string;
  credit: string;
}

interface EditEntry {
  entry_date: string;
  narration: string;
  lines: EditLine[];
}

const toEdit = (entry: CorrectableEntry): EditEntry => ({
  entry_date: entry.entry_date,
  narration: entry.narration,
  lines: entry.lines.map((line) => ({ ledger_account_id: line.ledger_account_id, debit: Number(line.debit) ? line.debit : '', credit: Number(line.credit) ? line.credit : '' })),
});

const paise = (value: string): number => Math.round(Number(value || 0) * 100);

/** Debit less credit, in paise: 0 when the entry balances. */
export function difference(entry: EditEntry): number {
  return entry.lines.reduce((sum, line) => sum + paise(line.debit) - paise(line.credit), 0);
}

export function changed(entry: EditEntry, original: CorrectableEntry): boolean {
  return JSON.stringify(entry) !== JSON.stringify(toEdit(original));
}

function toCorrection(id: string, entry: EditEntry, original: CorrectableEntry): Correction {
  return {
    entry_id: id,
    ...(entry.entry_date !== original.entry_date ? { entry_date: entry.entry_date } : {}),
    ...(entry.narration !== original.narration ? { narration: entry.narration } : {}),
    lines: entry.lines
      .filter((line) => line.ledger_account_id && (paise(line.debit) > 0 || paise(line.credit) > 0))
      .map((line) => ({ ledger_account_id: line.ledger_account_id, debit: paise(line.debit) / 100, credit: paise(line.credit) / 100 })),
  };
}

/** Per-entry messages of a refused save (`errors["corrections.<n>.…"]`), by entry id. */
function errorsByEntry(error: unknown, sent: readonly Correction[]): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const found: Record<string, string> = {};
  for (const [path, messages] of Object.entries((error.envelope.errors ?? {}) as Record<string, unknown>)) {
    const match = /^corrections\.(\d+)\./.exec(path);
    const row = match ? sent[Number(match[1])] : undefined;
    if (row && !found[row.entry_id]) found[row.entry_id] = Array.isArray(messages) ? String(messages[0]) : String(messages);
  }
  return found;
}

function EntryBlock({ original, entry, error, onChange }: {
  original: CorrectableEntry;
  entry: EditEntry;
  error?: string;
  onChange: (next: EditEntry) => void;
}): ReactNode {
  const diff = difference(entry);
  const isChanged = changed(entry, original);
  const setLine = (index: number, patch: Partial<EditLine>): void =>
    onChange({ ...entry, lines: entry.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) });
  return (
    <section aria-label={`Entry #${original.entry_number}`} className={`space-y-2 rounded-md border p-3 ${diff !== 0 || error ? 'border-destructive' : ''}`}>
      <div className="flex flex-wrap items-end gap-3">
        <p className="font-medium">#{original.entry_number}</p>
        <Input aria-label={`Date, entry ${original.entry_number}`} type="date" className="w-40" value={entry.entry_date} onChange={(e) => onChange({ ...entry, entry_date: e.target.value })} />
        <Input aria-label={`Narration, entry ${original.entry_number}`} className="min-w-64 flex-1" maxLength={900} value={entry.narration} onChange={(e) => onChange({ ...entry, narration: e.target.value })} />
        {isChanged && <span className="text-xs font-medium text-primary">Changed</span>}
      </div>
      {entry.lines.map((line, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <div className="w-72">
            <AccountSearchSelect value={line.ledger_account_id} onChange={(id) => setLine(index, { ledger_account_id: id })} />
          </div>
          <Input aria-label={`Debit, entry ${original.entry_number} line ${index + 1}`} type="number" min={0} step={0.01} className="w-32" value={line.debit} onChange={(e) => setLine(index, { debit: e.target.value })} />
          <Input aria-label={`Credit, entry ${original.entry_number} line ${index + 1}`} type="number" min={0} step={0.01} className="w-32" value={line.credit} onChange={(e) => setLine(index, { credit: e.target.value })} />
        </div>
      ))}
      {diff !== 0 && <p role="alert" className="text-sm text-destructive">Debits and credits differ by {formatCurrency(Math.abs(diff) / 100)}.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

/**
 * General Ledger › Journal Entries › Bulk Corrections (GL-25, screen GL-S10):
 * the period's manual entries edited in place on screen; Save Changes
 * reverses each changed entry and posts it again (nothing posted is edited).
 */
export function BulkCorrectionsPage(): ReactNode {
  const { addToast } = useToast();
  const year = currentFinancialYear();
  const [draft, setDraft] = useState<CorrectableQuery>({ from: year.start_date, to: year.end_date, accountId: '' });
  const [query, setQuery] = useState<CorrectableQuery | null>(null);
  const [edits, setEdits] = useState<Record<string, EditEntry>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const entries = useCorrectableEntries(query);
  const save = useBulkCorrect();
  const originals = entries.data ?? [];
  const current = (entry: CorrectableEntry): EditEntry => edits[entry.id] ?? toEdit(entry);
  const pending = originals.filter((entry) => changed(current(entry), entry));
  const blocked = pending.some((entry) => difference(current(entry)) !== 0);

  function fetchEntries(event: FormEvent): void {
    event.preventDefault();
    if (draft.from && draft.to && draft.from <= draft.to) {
      setEdits({});
      setErrors({});
      setQuery({ ...draft, accountId: draft.accountId || undefined });
    }
  }

  function saveChanges(): void {
    if (pending.length === 0) return addToast({ title: 'No changes to save' });
    const sent = pending.map((entry) => toCorrection(entry.id, current(entry), entry));
    save.mutate(sent, {
      onSuccess: (response) => {
        setEdits({});
        setErrors({});
        addToast({ title: 'Entries corrected', description: response.data.map((row) => `#${row.entry_number} → #${row.corrected_entry_number}`).join(', '), variant: 'success' });
      },
      onError: (error) => {
        setErrors(errorsByEntry(error, sent));
        addToast({ title: 'Nothing was corrected', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <form aria-label="Fetch entries to correct" className="flex flex-wrap items-end gap-3" onSubmit={fetchEntries}>
            {(['from', 'to'] as const).map((end) => (
              <div key={end} className="space-y-1">
                <Label htmlFor={`bc-${end}`}>{end === 'from' ? 'From' : 'To'}</Label>
                <Input id={`bc-${end}`} type="date" className="w-44" value={draft[end]} onChange={(e) => setDraft({ ...draft, [end]: e.target.value })} />
              </div>
            ))}
            <div className="w-72 space-y-1">
              <Label>Account (optional)</Label>
              <AccountSearchSelect value={draft.accountId ?? ''} onChange={(accountId) => setDraft({ ...draft, accountId })} />
            </div>
            <Button type="submit">Fetch</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 pt-6">
          {!query ? (
            <p className="py-8 text-center text-muted-foreground">Choose a period and press Fetch. Only manual entries in open years are listed.</p>
          ) : entries.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : entries.data === null ? (
            <p role="note" className="py-8 text-center text-muted-foreground">Bulk corrections are not available yet on this server.</p>
          ) : originals.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No manual entries to correct in this period.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Saving reverses each changed entry and posts it again with your changes. Nothing posted is edited.</p>
              {originals.map((entry) => (
                <EntryBlock key={entry.id} original={entry} entry={current(entry)} error={errors[entry.id]} onChange={(next) => setEdits((all) => ({ ...all, [entry.id]: next }))} />
              ))}
              <Button type="button" disabled={blocked || save.isPending} onClick={saveChanges}>
                {save.isPending ? 'Saving…' : `Save Changes${pending.length ? ` (${pending.length})` : ''}`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
