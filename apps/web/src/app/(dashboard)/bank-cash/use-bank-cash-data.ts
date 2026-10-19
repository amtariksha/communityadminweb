'use client';

import { useBankAccounts } from '@/hooks';
import { useAllLedgerAccounts } from '@/hooks/use-chart-of-accounts';
import type { BankAccountRow } from '../bank/bank-types';

/** The bank accounts and ledger accounts the Bank & Cash pages pick from. */
export function useBankCashData() {
  const accountsQuery = useBankAccounts();
  const ledgerAccounts = useAllLedgerAccounts().data ?? [];
  return {
    accounts: (accountsQuery.data ?? []) as unknown as BankAccountRow[],
    accountsLoading: accountsQuery.isLoading,
    ledgerAccounts,
  };
}
