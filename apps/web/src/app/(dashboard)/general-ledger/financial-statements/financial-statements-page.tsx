'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BalanceSheetView } from '@/components/ledger-reports/balance-sheet-view';
import { IncomeExpenditureView } from '@/components/ledger-reports/income-expenditure-view';
import { currentFinancialYear } from '@/lib/date';

interface Range {
  from: string;
  to: string;
}

/**
 * General Ledger › Financial Statements (GL-S14, GL-09): the balance sheet
 * as of To, then income & expenditure From–To, on one page. The By Period
 * basis, suppress options and vertical layout arrive with GL-16.
 */
export function FinancialStatementsPage(): ReactNode {
  const year = currentFinancialYear();
  const [draft, setDraft] = useState<Range>({ from: year.start_date, to: year.end_date });
  const [range, setRange] = useState<Range | null>(null);
  const invalid = draft.from !== '' && draft.to !== '' && draft.from > draft.to;

  function generate(event: FormEvent): void {
    event.preventDefault();
    if (draft.from && draft.to && !invalid) setRange(draft);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <form aria-label="Generate financial statements" className="flex flex-wrap items-end gap-3" onSubmit={generate}>
            {(['from', 'to'] as const).map((end) => (
              <div key={end} className="space-y-1">
                <Label htmlFor={`fs-${end}`}>{end === 'from' ? 'From' : 'To'}</Label>
                <Input
                  id={`fs-${end}`}
                  type="date"
                  className="w-44"
                  required
                  value={draft[end]}
                  onChange={(e) => setDraft((current) => ({ ...current, [end]: e.target.value }))}
                />
              </div>
            ))}
            <Button type="submit" disabled={invalid}>
              Generate Reports
            </Button>
          </form>
          {invalid && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              The from date is after the to date.
            </p>
          )}
        </CardContent>
      </Card>
      {range ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Balance Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceSheetView asOfDate={range.to} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Income &amp; Expenditure</CardTitle>
            </CardHeader>
            <CardContent>
              <IncomeExpenditureView startDate={range.from} endDate={range.to} />
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="py-8 text-center text-muted-foreground">Choose the dates and press Generate Reports.</p>
      )}
    </div>
  );
}
