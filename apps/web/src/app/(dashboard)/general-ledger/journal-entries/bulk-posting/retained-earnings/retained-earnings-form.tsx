'use client';

import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { FinancialYear } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCloseFinancialYear, useFinancialYears } from '@/hooks';
import type { CloseFinancialYearResult } from '@/hooks/use-ledger';
import { friendlyError } from '@/lib/api-error';
import { calendarDateIST } from '@/lib/date';
import { formatCurrency, formatDate } from '@/lib/utils';
import { canChangeSettings } from '../../../../settings/settings-access';

/** "Entry #12 posted. Surplus ₹7,000.00 moved to Retained Earnings (Current)." */
export function passResultText(result: CloseFinancialYearResult): string {
  if (!result.closing_entry_id) return 'Nothing to pass — already up to date.';
  const side = result.surplus < 0 ? 'Deficit' : 'Surplus';
  const entry = result.entry_number ? `Entry #${result.entry_number} posted. ` : 'Entry posted. ';
  return `${entry}${side} ${formatCurrency(Math.abs(result.surplus))} moved to Retained Earnings (Current).`;
}

function yearOption(year: FinancialYear): string {
  const end = formatDate(calendarDateIST(year.end_date));
  return year.is_frozen ? `${end} (${year.label}, closed)` : `${end} (${year.label})`;
}

function NoYears(): ReactNode {
  return (
    <p className="text-sm text-muted-foreground">
      Set up a financial year first, in{' '}
      <Link href="/settings" className="text-primary underline">
        Settings › Financial Years
      </Link>
      .
    </p>
  );
}

/**
 * Bulk Posting › Automatically Pass Retained Earnings (GL-S9): posts, or
 * tops up, the year-close entry moving the chosen year's surplus or deficit
 * to Retained Earnings (Current) and leaves the year open (`freeze: false`,
 * decision G5). Perform Year End, which freezes, is on Trial Balance.
 */
export function RetainedEarningsForm(): ReactNode {
  const yearsQuery = useFinancialYears();
  const closeYear = useCloseFinancialYear();
  const [yearId, setYearId] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const years = yearsQuery.data ?? [];

  if (yearsQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading financial years…</p>;
  if (years.length === 0) return <NoYears />;
  if (!canChangeSettings()) {
    return (
      <p role="note" className="text-sm text-muted-foreground">
        Only the society&apos;s community admin can pass retained earnings.
      </p>
    );
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (!yearId) return;
    setResult(null);
    setError(null);
    closeYear.mutate(
      { id: yearId, freeze: false },
      {
        onSuccess: (response) => setResult(passResultText(response.data)),
        onError: (failure) => setError(friendlyError(failure)),
      },
    );
  }

  return (
    <form aria-label="Pass retained earnings" className="space-y-3" onSubmit={submit}>
      <div className="max-w-sm space-y-1">
        <Label htmlFor="re-year">Choose Year End Closure Date</Label>
        <Select id="re-year" value={yearId} required onChange={(e) => setYearId(e.target.value)}>
          <option value="">Select…</option>
          {years.map((year) => (
            <option key={year.id} value={year.id} disabled={year.is_frozen}>
              {yearOption(year)}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={!yearId || closeYear.isPending}>
        {closeYear.isPending ? 'Passing…' : 'Automatically Pass Retained Earnings'}
      </Button>
      {result && <p role="status" className="text-sm">{result}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
