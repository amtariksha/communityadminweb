'use client';

import { useState, type ReactNode } from 'react';
import type { FinancialYear } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TrialBalanceOptions } from '@/components/ledger-reports/trial-balance-options';
import { useFinancialYears } from '@/hooks';
import { yearContaining } from '@/lib/date';
import { canChangeSettings } from '../../settings/settings-access';
import { YearEndDialog } from '../../settings/financial-year-dialogs';

/**
 * General Ledger › Trial Balance (GL-S13): Complete, Period or Only
 * Migration Balance with Suppress Retained Earnings (GL-15), and Perform
 * Year End (GL-06) for the year To falls in.
 */
export function TrialBalancePage(): ReactNode {
  const [yearEnd, setYearEnd] = useState<FinancialYear | null>(null);
  const years = useFinancialYears().data ?? [];
  const mayCloseYear = canChangeSettings();

  function yearEndButton(to: string): ReactNode {
    if (!mayCloseYear) return null;
    const year = yearContaining(years, to);
    return (
      <Button
        type="button"
        variant="outline"
        disabled={!year || year.is_frozen}
        title={!year ? 'No financial year holds this date' : year.is_frozen ? `${year.label} is frozen` : undefined}
        onClick={() => setYearEnd(year ?? null)}
      >
        Perform Year End{year ? ` (${year.label})` : ''}
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <TrialBalanceOptions actions={yearEndButton} />
        </CardContent>
      </Card>
      <YearEndDialog year={yearEnd} onClose={() => setYearEnd(null)} />
    </div>
  );
}
