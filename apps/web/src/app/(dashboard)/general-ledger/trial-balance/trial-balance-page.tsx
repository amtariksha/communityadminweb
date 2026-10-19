'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import type { FinancialYear } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrialBalanceView } from '@/components/ledger-reports/trial-balance-view';
import { useFinancialYears } from '@/hooks';
import { todayIST, yearContaining } from '@/lib/date';
import { canChangeSettings } from '../../settings/settings-access';
import { YearEndDialog } from '../../settings/financial-year-dialogs';

/**
 * General Ledger › Trial Balance (GL-S13, GL-09): today's trial balance as
 * of a date, and Perform Year End (GL-06) for the year that date falls in.
 * Period and migration-only options arrive with GL-15.
 */
export function TrialBalancePage(): ReactNode {
  const [to, setTo] = useState(todayIST());
  const [asOf, setAsOf] = useState<string | null>(null);
  const [yearEnd, setYearEnd] = useState<FinancialYear | null>(null);
  const years = useFinancialYears().data ?? [];
  const year = yearContaining(years, to);
  const mayCloseYear = canChangeSettings();

  function generate(event: FormEvent): void {
    event.preventDefault();
    if (to) setAsOf(to);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <form aria-label="Generate trial balance" className="flex flex-wrap items-end gap-3" onSubmit={generate}>
            <div className="space-y-1">
              <Label htmlFor="tb-to">To</Label>
              <Input id="tb-to" type="date" className="w-44" value={to} onChange={(e) => setTo(e.target.value)} required />
            </div>
            <Button type="submit">Generate Trial balance</Button>
            {mayCloseYear && (
              <Button
                type="button"
                variant="outline"
                disabled={!year || year.is_frozen}
                title={!year ? 'No financial year holds this date' : year.is_frozen ? `${year.label} is frozen` : undefined}
                onClick={() => setYearEnd(year ?? null)}
              >
                Perform Year End{year ? ` (${year.label})` : ''}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {asOf ? (
            <TrialBalanceView asOfDate={asOf} />
          ) : (
            <p className="py-8 text-center text-muted-foreground">Choose a date and press Generate Trial balance.</p>
          )}
        </CardContent>
      </Card>
      <YearEndDialog year={yearEnd} onClose={() => setYearEnd(null)} />
    </div>
  );
}
