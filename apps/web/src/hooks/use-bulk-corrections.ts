'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { ledgerKeys } from './use-ledger';

/** One manual entry the grid may correct (GET /ledger/journal-entries/bulk-correct). */
export interface CorrectableEntry {
  id: string;
  entry_number: number;
  entry_date: string;
  narration: string;
  lines: Array<{ ledger_account_id: string; account_code: string | null; account_name: string; debit: string; credit: string }>;
}

export interface Correction {
  entry_id: string;
  entry_date?: string;
  narration?: string;
  lines: Array<{ ledger_account_id: string; debit: number; credit: number }>;
}

export interface CorrectionResult {
  entry_id: string;
  entry_number: number;
  reversal_entry_number: number;
  corrected_entry_id: string;
  corrected_entry_number: number;
}

export interface CorrectableQuery {
  from: string;
  to: string;
  accountId?: string;
}

/** null on an API older than GL-25 (the page says not available yet). */
export function useCorrectableEntries(query: CorrectableQuery | null) {
  return useQuery({
    queryKey: [...ledgerKeys.journalEntries(), 'correctable', query],
    enabled: query !== null,
    queryFn: async (): Promise<CorrectableEntry[] | null> => {
      const q = query as CorrectableQuery;
      const params: Record<string, string> = { from_date: q.from, to_date: q.to };
      if (q.accountId) params.account_id = q.accountId;
      try {
        return (await api.get<{ data: CorrectableEntry[] }>('/ledger/journal-entries/bulk-correct', { params })).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useBulkCorrect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (corrections: Correction[]) => api.post<{ data: CorrectionResult[] }>('/ledger/journal-entries/bulk-correct', corrections),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
    },
  });
}
