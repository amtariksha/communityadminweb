'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import type { FinancialYear } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BalanceSheetView } from '@/components/ledger-reports/balance-sheet-view';
import { IncomeExpenditureView } from '@/components/ledger-reports/income-expenditure-view';
import { FinancialStatementsView, type StatementLayout } from '@/components/ledger-reports/financial-statements-view';
import { ReportSkeleton } from '@/components/ledger-reports/report-skeleton';
import { useFinancialYears } from '@/hooks';
import { useFinancialStatements, type FinancialStatementsParams } from '@/hooks/use-ledger-statements';
import { ApiError } from '@/lib/api-error';
import { calendarDateIST, currentFinancialYear } from '@/lib/date';

interface Draft extends FinancialStatementsParams {
  layout: StatementLayout;
}

/** "March 2027" for the year ending 31-03-2027. */
export function yearLabel(year: FinancialYear): string {
  const end = new Date(`${calendarDateIST(String(year.end_date))}T00:00:00Z`);
  return `${end.toLocaleString('en-IN', { month: 'long', timeZone: 'UTC' })} ${end.getUTCFullYear()}`;
}

function rangeOf(params: FinancialStatementsParams, years: readonly FinancialYear[]): { from: string; to: string } | null {
  if (params.basis === 'date') return params.from && params.to ? { from: params.from, to: params.to } : null;
  const year = years.find((candidate) => candidate.id === params.fyId);
  return year ? { from: calendarDateIST(String(year.start_date)), to: calendarDateIST(String(year.end_date)) } : null;
}

function Radio({ name, checked, label, onChange }: { name: string; checked: boolean; label: string; onChange: () => void }): ReactNode {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function Output({ params, layout, years }: { params: FinancialStatementsParams; layout: StatementLayout; years: readonly FinancialYear[] }): ReactNode {
  const query = useFinancialStatements(params);
  if (query.isLoading) return <ReportSkeleton />;
  if (query.error instanceof ApiError && query.error.status === 404) {
    const range = rangeOf(params, years);
    return (
      <div className="space-y-4">
        <p role="note" className="text-sm text-muted-foreground">The suppress options and layouts are not available yet on this server; these are today&apos;s statements.</p>
        {range && <BalanceSheetView asOfDate={range.to} />}
        {range && <IncomeExpenditureView startDate={range.from} endDate={range.to} />}
      </div>
    );
  }
  if (query.isError || !query.data) return <p role="alert" className="py-8 text-center text-destructive">The statements could not be loaded.</p>;
  return <FinancialStatementsView data={query.data} layout={layout} />;
}

/**
 * General Ledger › Financial Statements (GL-S14, GL-16): By Period (a
 * financial year) or By Date, the two suppress switches and Horizontal /
 * Vertical layout; the balance sheet then the income & expenditure.
 */
export function FinancialStatementsPage(): ReactNode {
  const years = useFinancialYears().data ?? [];
  const today = currentFinancialYear();
  const [draft, setDraft] = useState<Draft>({
    basis: 'period', fyId: '', from: today.start_date, to: today.end_date,
    suppressRetainedEarnings: true, suppressOpeningBalance: false, layout: 'horizontal',
  });
  const [shown, setShown] = useState<Draft | null>(null);
  const patch = (next: Partial<Draft>): void => setDraft((current) => ({ ...current, ...next }));
  const fyId = draft.fyId || years.find((year) => year.is_current)?.id || years[0]?.id || '';
  const invalid = draft.basis === 'date' ? !draft.from || !draft.to || draft.from > draft.to : !fyId;

  function generate(event: FormEvent): void {
    event.preventDefault();
    if (!invalid) setShown({ ...draft, fyId });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <form aria-label="Generate financial statements" className="space-y-3" onSubmit={generate}>
            <div className="flex flex-wrap gap-4">
              <Radio name="fs-basis" checked={draft.basis === 'period'} label="By Period" onChange={() => patch({ basis: 'period' })} />
              <Radio name="fs-basis" checked={draft.basis === 'date'} label="By Date" onChange={() => patch({ basis: 'date' })} />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              {draft.basis === 'period' ? (
                <div className="space-y-1">
                  <Label htmlFor="fs-period">Period</Label>
                  <select id="fs-period" className="flex h-10 w-48 rounded-md border border-input bg-background px-3 text-sm" value={fyId} onChange={(e) => patch({ fyId: e.target.value })}>
                    {years.map((year) => (
                      <option key={year.id} value={year.id}>{yearLabel(year)}</option>
                    ))}
                  </select>
                </div>
              ) : (
                (['from', 'to'] as const).map((end) => (
                  <div key={end} className="space-y-1">
                    <Label htmlFor={`fs-${end}`}>{end === 'from' ? 'From' : 'To'}</Label>
                    <Input id={`fs-${end}`} type="date" className="w-44" value={draft[end] ?? ''} onChange={(e) => patch({ [end]: e.target.value })} />
                  </div>
                ))
              )}
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" checked={draft.suppressRetainedEarnings} onChange={(e) => patch({ suppressRetainedEarnings: e.target.checked })} />
                Suppress Retained Earnings Transactions
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" checked={draft.suppressOpeningBalance} onChange={(e) => patch({ suppressOpeningBalance: e.target.checked })} />
                Suppress Opening Balance
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Radio name="fs-layout" checked={draft.layout === 'horizontal'} label="Horizontal Format" onChange={() => patch({ layout: 'horizontal' })} />
              <Radio name="fs-layout" checked={draft.layout === 'vertical'} label="Vertical Format" onChange={() => patch({ layout: 'vertical' })} />
              <Button type="submit" disabled={invalid}>Generate Reports</Button>
            </div>
            {draft.basis === 'date' && draft.from && draft.to && draft.from > draft.to && (
              <p role="alert" className="text-sm text-destructive">The from date is after the to date.</p>
            )}
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {shown ? (
            <Output params={shown} layout={shown.layout} years={years} />
          ) : (
            <p className="py-8 text-center text-muted-foreground">Choose the options and press Generate Reports.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
