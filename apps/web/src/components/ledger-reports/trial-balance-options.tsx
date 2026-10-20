'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TrialBalanceParams } from '@/hooks/use-ledger-statements';
import { todayIST } from '@/lib/date';
import { TrialBalanceReportView } from './trial-balance-report';

const MODES: ReadonlyArray<[TrialBalanceParams['mode'], string]> = [
  ['complete', 'Complete Trial Balance'],
  ['period', 'Period Trial Balance'],
  ['migration', 'Only Migration Balance'],
];

interface TrialBalanceOptionsProps {
  /** Shown beside Generate (classic: Perform Year End for the year of To). */
  actions?: (to: string) => ReactNode;
}

/**
 * Trial balance generate form (GL-15, screen GL-S13): From (period only),
 * To, Type and Suppress Retained Earnings Transactions; the report below.
 */
export function TrialBalanceOptions({ actions }: TrialBalanceOptionsProps): ReactNode {
  const [draft, setDraft] = useState<TrialBalanceParams>({ mode: 'complete', from: '', to: todayIST(), suppressRetainedEarnings: false });
  const [params, setParams] = useState<TrialBalanceParams | null>(null);
  const period = draft.mode === 'period';
  const invalid = period && (!draft.from || draft.from > draft.to);
  const patch = (next: Partial<TrialBalanceParams>): void => setDraft((current) => ({ ...current, ...next }));

  function generate(event: FormEvent): void {
    event.preventDefault();
    if (!draft.to || invalid) return;
    setParams({ ...draft, from: period ? draft.from : undefined });
  }

  return (
    <div className="space-y-4">
      <form aria-label="Generate trial balance" className="space-y-3" onSubmit={generate}>
        <fieldset className="flex flex-wrap gap-4">
          <legend className="sr-only">Type</legend>
          {MODES.map(([mode, label]) => (
            <label key={mode} className="flex items-center gap-2 text-sm">
              <input type="radio" name="tb-mode" checked={draft.mode === mode} onChange={() => patch({ mode })} />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="tb-from">From</Label>
            <Input id="tb-from" type="date" className="w-44" disabled={!period} value={draft.from ?? ''} onChange={(e) => patch({ from: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tb-to">To</Label>
            <Input id="tb-to" type="date" className="w-44" required value={draft.to} onChange={(e) => patch({ to: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={draft.suppressRetainedEarnings} onChange={(e) => patch({ suppressRetainedEarnings: e.target.checked })} />
            Suppress Retained Earnings Transactions
          </label>
          <Button type="submit" disabled={invalid}>Generate Trial balance</Button>
          {actions?.(draft.to)}
        </div>
        {invalid && <p role="alert" className="text-sm text-destructive">A period trial balance needs a From date on or before To.</p>}
      </form>
      {params ? (
        <TrialBalanceReportView params={params} />
      ) : (
        <p className="py-8 text-center text-muted-foreground">Choose the options and press Generate Trial balance.</p>
      )}
    </div>
  );
}
