'use client';

import { type ReactNode } from 'react';
import { AccountsTab } from '../../bank/accounts-tab';
import { ReconciliationTab } from '../../bank/reconciliation-tab';
import { useBankCashData } from '../use-bank-cash-data';

/**
 * Bank & Cash › Bank & Cash Accounts › Register (BANK-06): the account
 * cards and today's reconciliation register, until BANK-08's Book / Bank
 * tiles and fetch register replace them.
 */
export function BankCashAccountsPage(): ReactNode {
  const { accounts, accountsLoading } = useBankCashData();
  return (
    <div className="space-y-6">
      <AccountsTab accounts={accounts} loading={accountsLoading} />
      <ReconciliationTab accounts={accounts} />
    </div>
  );
}
