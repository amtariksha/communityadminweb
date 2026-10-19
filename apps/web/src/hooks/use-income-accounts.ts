'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ledgerKeys } from '@/hooks/use-ledger';

export type IncomeAccountScope = 'member' | 'non_member' | 'both';

/** An income ledger on Setup › Income Accounts (INC-38). */
export interface IncomeAccount {
  id: string;
  code: string | null;
  name: string;
  is_system: boolean;
  is_active: boolean;
  income_scope: IncomeAccountScope;
  invoice_display_order: number | null;
  hsn_sac: string | null;
}

export interface IncomeAccountSaveRow {
  id: string;
  income_scope: IncomeAccountScope;
  invoice_display_order: number | null;
  hsn_sac: string | null;
}

export const incomeAccountKeys = { all: ['income-accounts'] as const };

export function useIncomeAccounts() {
  return useQuery({
    queryKey: incomeAccountKeys.all,
    meta: { suppressToast: true },
    retry: false,
    queryFn: () => api.get<{ data: IncomeAccount[] }>('/ledger/income-accounts').then((res) => res.data),
  });
}

export function useSaveIncomeAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: IncomeAccountSaveRow[]) =>
      api.put<{ data: IncomeAccount[] }>('/ledger/income-accounts', { rows }).then((res) => res.data),
    onSuccess: (saved) => {
      queryClient.setQueryData(incomeAccountKeys.all, saved);
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
    },
  });
}
