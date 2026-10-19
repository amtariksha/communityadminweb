'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ledgerKeys } from './use-ledger';

/** One row of GET /ledger/journal-entries (GL-10). Money is text, e.g. "500.00". */
export interface JournalEntryRow {
  id: string;
  financial_year_id: string;
  entry_number: number;
  entry_date: string;
  narration: string;
  source_type: string;
  source_id: string | null;
  posted_by: string | null;
  /** Absent from an API older than GL-10. */
  posted_by_name?: string | null;
  created_at: string;
  is_reversed: boolean;
  total_debit?: string;
  total_credit?: string;
  reverses_entry_id?: string | null;
  reverses_entry_number?: number | null;
  reversed_by_entry_id?: string | null;
  reversed_by_entry_number?: number | null;
}

export interface JournalEntrySourceRef {
  type: string;
  id: string;
  number: string | null;
}

export interface JournalEntryView extends JournalEntryRow {
  source_ref?: JournalEntrySourceRef | null;
  lines: Array<{
    id: string;
    ledger_account_id: string;
    account_code?: string;
    account_name?: string;
    debit: string | number;
    credit: string | number;
  }>;
}

export interface JournalEntryFilters {
  start_date?: string;
  end_date?: string;
  account_id?: string;
  search?: string;
  source_type?: string;
  include_reversals?: boolean;
  page?: number;
  limit?: number;
}

/** Query parameters for the list and its export (same filters). */
export function journalEntryParams(filters: JournalEntryFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const key of ['start_date', 'end_date', 'account_id', 'search', 'source_type'] as const) {
    const value = filters[key];
    if (value) params[key] = value;
  }
  if (filters.include_reversals === false) params.include_reversals = 'false';
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

export function useJournalEntries(filters: JournalEntryFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ledgerKeys.journalEntryList(filters),
    queryFn: () =>
      api.get<{ data: JournalEntryRow[]; total: number }>('/ledger/journal-entries', {
        params: journalEntryParams(filters),
      }),
    enabled: options.enabled ?? true,
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: ledgerKeys.journalEntry(id),
    queryFn: () => api.get<{ data: JournalEntryView }>(`/ledger/journal-entries/${id}`).then((res) => res.data),
    enabled: id !== '',
  });
}

/** Reverse a manual entry: a mirror entry dated today; the original stays. */
export function useReverseJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ data: JournalEntryView }>(`/ledger/journal-entries/${id}/reverse`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}
