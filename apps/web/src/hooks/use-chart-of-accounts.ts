'use client';

import { useQuery } from '@tanstack/react-query';
import type { AccountType, LedgerAccount } from '@communityos/shared';
import { api } from '@/lib/api';
import { ledgerKeys } from './use-ledger';

// GET /ledger/accounts pages at most 100 rows on an API older than GL-12
// (a larger limit is refused), so the chart is read page by page.
const PAGE = 100;
const MAX_PAGES = 30;

export interface ChartAccount extends LedgerAccount {
  group_name?: string;
}

async function fetchAllAccounts(types: readonly AccountType[]): Promise<ChartAccount[]> {
  const accounts: ChartAccount[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const params: Record<string, string> = { page: String(page), limit: String(PAGE) };
    if (types.length > 0) params.account_type = types.join(',');
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
