'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateJournalEntry, useFinancialYears } from '@/hooks';
import { todayIST } from '@/lib/date';
import { clampDateString, financialDateBounds } from '@/lib/utils';
import { DebitCreditGrid } from './debit-credit-grid';
import { journalEntryError } from './journal-entry-errors';
import { apiLines, blankLines, entryProblems, type EntryLine } from './journal-lines';
import { DialogExtras, VOUCHER_TYPES } from './dialog-extras';
import { SideLinesEditor, sideLine } from './side-lines-editor';

/** What the API answers on a post. */
export interface PostedEntry {
  id: string;
  entry_number: number | string;
}

export interface JournalEntryFormProps {
  mode: FormMode;
  /** Dialog only. */
  open?: boolean;
  onClose: () => void;
  onSaved: (entry: PostedEntry) => void;
}

const PAGE_LINES = 10;
const initialLines = (mode: FormMode): EntryLine[] =>
  mode === 'page' ? blankLines(PAGE_LINES) : [sideLine('debit'), sideLine('credit')];

/**
 * One manual journal entry form, two presentations (SB-07, GL-11). The
 * page (classic, GL-S6) is a fixed Debit / Credit grid with no year or
 * voucher choice: the API takes the open year holding the date and the
 * voucher is a Journal. The dialog (standard) keeps its year and voucher
 * type selects and Dr/Cr lines. Both refuse to post until it balances.
 */
export function JournalEntryForm({ mode, open, onClose, onSaved }: JournalEntryFormProps): ReactNode {
  const dateBounds = useMemo(() => financialDateBounds(), []);
  const years = useFinancialYears().data ?? [];
  const createEntry = useCreateJournalEntry();
  const [entryDate, setEntryDate] = useState(todayIST());
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<EntryLine[]>(() => initialLines(mode));
  const [yearId, setYearId] = useState('');
  const [voucherType, setVoucherType] = useState<string>(VOUCHER_TYPES[0].value);
  const [error, setError] = useState<string | null>(null);
  const chosenYear = yearId || years.find((year) => year.is_current)?.id || years[0]?.id || '';
  const problems = entryProblems(lines);
  const ready = problems.length === 0 && narration.trim() !== '' && entryDate !== '' && (mode === 'page' || chosenYear !== '');

  function reset(): void {
    setNarration('');
    setLines(initialLines(mode));
    setError(null);
  }

  function save(): void {
    if (!ready) return;
    setError(null);
    const body = {
      entry_date: entryDate,
      narration: narration.trim(),
      lines: apiLines(lines),
      ...(mode === 'dialog' ? { financial_year_id: chosenYear, voucher_type_name: voucherType } : { voucher_type_name: 'Journal' }),
    };
    createEntry.mutate(body, {
      onSuccess: (response) => {
        reset();
        onSaved(response.data as unknown as PostedEntry);
      },
      onError: (failure) => setError(journalEntryError(failure)),
    });
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title={mode === 'page' ? 'Free Flow Journal Entries' : 'New Journal Entry'}
      description={mode === 'dialog' ? 'Free-form posting against any two (or more) ledger accounts. Lines must balance: Σ Debits = Σ Credits.' : undefined}
      onClose={() => { reset(); onClose(); }}
      onSave={save}
      saving={createEntry.isPending}
      saveDisabled={!ready}
      saveLabel={mode === 'page' ? 'Submit' : 'Post entry'}
      savingLabel="Posting…"
      dialogClassName="max-w-3xl"
    >
      {error && (
        <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`je-date-${mode}`}>Journal Date</Label>
          <Input
            id={`je-date-${mode}`}
            type="date"
            required
            min={dateBounds.min}
            max={dateBounds.max}
            value={entryDate}
            onChange={(e) => setEntryDate(clampDateString(e.target.value, dateBounds.min, dateBounds.max))}
          />
        </div>
        {mode === 'dialog' && (
          <DialogExtras years={years} yearId={chosenYear} onYear={setYearId} voucherType={voucherType} onVoucherType={setVoucherType} />
        )}
      </div>
      {mode === 'page' ? <DebitCreditGrid lines={lines} onChange={setLines} /> : <SideLinesEditor lines={lines} onChange={setLines} />}
      <div className="space-y-2">
        <Label htmlFor={`je-narration-${mode}`}>Narration</Label>
        <Textarea
          id={`je-narration-${mode}`}
          required
          rows={2}
          maxLength={1000}
          placeholder="e.g. Adjustment — clubhouse rental income mis-posted to membership"
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
        />
      </div>
      {problems.length > 0 && lines.some((line) => line.ledger_account_id || line.debit || line.credit) && (
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </FormFrame>
  );
}
