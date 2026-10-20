'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AccountType, LedgerAccount } from '@communityos/shared';
import { api } from '@/lib/api';
import { ledgerKeys } from './use-ledger';

// GET /ledger/accounts pages at most 100 rows on an API older than GL-12
// (a larger limit is refused), so the chart is read page by page.
const PAGE = 100;
const MAX_PAGES = 30;

export interface ChartAccount extends LedgerAccount {
  group_name?: string;
  // GL-14: who deactivated the account and when (null while active).
  deactivated_by_name?: string | null;
  deactivated_at?: string | null;
}

async function fetchAllAccounts(types: readonly AccountType[], inactive = false): Promise<ChartAccount[]> {
  const accounts: ChartAccount[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const params: Record<string, string> = { page: String(page), limit: String(PAGE) };
    if (types.length > 0) params.account_type = types.join(',');
    if (inactive) params.is_active = 'false';
    const result = await api.get<{ data: ChartAccount[]; total: number }>('/ledger/accounts', { params });
    accounts.push(...result.data);
    if (accounts.length >= result.total || result.data.length < PAGE) break;
  }
  return accounts;
}

/**
 * Every ledger account of the given types (all types when none), in code
 * order. Kept under the accounts key, so any account change refetches it.
 */
export function useAllLedgerAccounts(types: readonly AccountType[] = []) {
  return useQuery({
    queryKey: [...ledgerKeys.accounts(), 'all', [...types].sort().join(',')],
    queryFn: () => fetchAllAccounts(types),
  });
}

/**
 * The deactivated accounts of the given types (GL-14). `is_active=false`
 * means the same on an API older than GL-14, so this list is right on both.
 */
export function useDeactivatedAccounts(types: readonly AccountType[] = []) {
  return useQuery({
    queryKey: [...ledgerKeys.accounts(), 'deactivated', [...types].sort().join(',')],
    queryFn: () => fetchAllAccounts(types, true),
  });
}

function useAccountAction<Input>(call: (input: Input) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() }),
  });
}

/** POST /ledger/accounts/:id/deactivate (GL-14). */
export function useDeactivateLedgerAccount() {
  return useAccountAction((id: string) => api.post(`/ledger/accounts/${id}/deactivate`, {}));
}

/** POST /ledger/accounts/:id/activate (GL-14). */
export function useActivateLedgerAccount() {
  return useAccountAction((id: string) => api.post(`/ledger/accounts/${id}/activate`, {}));
}

/** DELETE /ledger/accounts/:id — only a deactivated, never-posted account (GL-14). */
export function useDeleteLedgerAccount() {
  return useAccountAction((id: string) => api.delete(`/ledger/accounts/${id}`));
}

/** One row of PUT /ledger/accounts/bulk (GL-12). */
export interface AccountBulkRow {
  id?: string;
  group_id: string;
  code: string;
  name: string;
  opening_balance?: number;
}

export interface AccountBulkResult {
  created: number;
  updated: number;
  entries_posted: number;
  // GL-14; absent on an older API, which ignores deactivations.
  deactivated?: number;
}

/** Save one type's added and changed accounts from the editable grid. */
export function useSaveAccountsBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { type: 'asset' | 'liability' | 'income' | 'expense'; rows: AccountBulkRow[]; deactivations?: string[] }) =>
      api.put<{ data: AccountBulkResult }>('/ledger/accounts/bulk', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
    },
  });
}

/** One group row of PUT /ledger/account-groups/bulk (GL-13). */
export interface GroupBulkRow {
  id?: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  code: string;
  name: string;
  parent_id: string | null;
}

export interface GroupBulkResult {
  created: number;
  updated: number;
  deactivated: number;
}

/** Save the four group grids at once: added and changed groups, and groups to deactivate. */
export function useSaveAccountGroupsBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rows: GroupBulkRow[]; deactivations: string[] }) =>
      api.put<{ data: GroupBulkResult }>('/ledger/account-groups/bulk', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accountGroups() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
    },
  });
}
