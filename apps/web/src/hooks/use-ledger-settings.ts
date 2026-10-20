'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { ledgerKeys } from './use-ledger';

/** GET /ledger/settings (GL-19). */
export interface LedgerSettings {
  accounting_start_date: string | null;
  earliest_financial_year_start: string | null;
  earliest_entry_date: string | null;
}

const settingsKey = () => [...ledgerKeys.all, 'settings'] as const;

/** The books' settings; null on an API without the route (shown as not available yet). */
export function useLedgerSettings() {
  return useQuery({
    queryKey: settingsKey(),
    queryFn: async (): Promise<LedgerSettings | null> => {
      try {
        return (await api.get<{ data: LedgerSettings }>('/ledger/settings')).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

/** PUT /ledger/settings/accounting-start-date — community admin only. */
export function useSaveAccountingStartDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountingStartDate: string | null) =>
      api.put<{ data: LedgerSettings }>('/ledger/settings/accounting-start-date', { accounting_start_date: accountingStartDate }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKey() }),
  });
}
