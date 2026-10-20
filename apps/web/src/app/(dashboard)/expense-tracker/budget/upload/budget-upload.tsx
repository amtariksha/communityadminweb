'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { ImportFlow } from '@/components/import/import-flow';
import { ImportLog } from '@/components/import/import-log';
import { Button } from '@/components/ui/button';
import { canWriteFinance } from '@/lib/finance-roles';

const BUDGET_TARGET = { endpoint: '/budgets/imports', type: 'expense_budget' } as const;

/**
 * Expense Tracker › Budget › Setup via Excel Upload (EXP-26): head code and
 * the year's amount per row, for the year the Budget screen shows; saved
 * as the setup grid saves (a frozen year is refused).
 */
export function BudgetUpload(): ReactNode {
  const router = useRouter();
  const yearId = useSearchParams()?.get('fy') ?? '';
  const back = yearId ? `/expense-tracker/budget?fy=${yearId}` : '/expense-tracker/budget';
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => router.push(back)}>
          Close
        </Button>
      </div>
      {yearId ? (
        <ImportFlow
          target={BUDGET_TARGET}
          title="Setup via Excel Upload"
          description="One row per expense head: Head Code and the budget for the whole year (0 clears it). Any row with an error stops the save."
          columns={[{ key: 'head_code', label: 'Head Code' }, { key: 'head_name', label: 'Head Name' }, { key: 'amount', label: 'Amount' }]}
          options={{ financial_year_id: yearId }}
          applyLabel="Save budget for"
          allowed={canWriteFinance()}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Open this from the Budget screen of a financial year.</p>
      )}
      <ImportLog endpoint={BUDGET_TARGET.endpoint} labels={{ expense_budget: 'Expense budget' }} />
    </div>
  );
}
