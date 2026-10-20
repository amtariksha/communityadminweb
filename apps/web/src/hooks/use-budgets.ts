'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { purchaseRequestKeys } from '@/hooks/use-purchase-requests';

/**
 * Expense budget per expense head per financial year (EXP-21 / EXP-22):
 * the Budget screen, its setup grid and Clone Previous Year. The read
 * answers `null` from an API older than these routes (404), so the screen
 * can say "not available yet" instead of failing.
 */

export interface BudgetYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_frozen: boolean;
}

export interface BudgetRow {
  ledger_account_id: string;
  code: string | null;
  account_name: string;
  group_name: string;
  budget: string;
  booked: string;
  variance: string;
}

export interface BudgetList {
  financial_year: BudgetYear;
  data: BudgetRow[];
  totals: { budget: string; booked: string; variance: string };
}

export interface BudgetSaveResult extends BudgetList {
  changed: number;
}

export interface SaveBudgetsInput {
  financial_year_id: string;
  rows: Array<{ ledger_account_id: string; amount: number }>;
}

export interface CloneBudgetsInput {
  from_financial_year_id: string;
  to_financial_year_id: string;
  only_empty: boolean;
}

export const budgetKeys = {
  all: ['budgets'] as const,
  year: (financialYearId: string) => [...budgetKeys.all, 'year', financialYearId] as const,
};

async function nullOn404<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** A year's budget (the current year when `financialYearId` is empty). */
export function useBudget(financialYearId: string) {
  return useQuery({
    queryKey: budgetKeys.year(financialYearId),
    meta: { suppressToast: true },
    queryFn: () =>
      nullOn404(() =>
        api.get<BudgetList>('/budgets', { params: financialYearId ? { financial_year_id: financialYearId } : {} }),
      ),
  });
}

function useBudgetMutation<Input>(send: (input: Input) => Promise<BudgetSaveResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      // The purchase-request head picker shows each head's budget.
      queryClient.invalidateQueries({ queryKey: purchaseRequestKeys.all });
    },
  });
}

/** The setup grid's one save (SB-08). */
export function useSaveBudgets() {
  return useBudgetMutation((input: SaveBudgetsInput) => api.put<BudgetSaveResult>('/budgets/bulk', input));
}

/** Clone Previous Year. */
export function useCloneBudgets() {
  return useBudgetMutation((input: CloneBudgetsInput) => api.post<BudgetSaveResult>('/budgets/clone', input));
}
