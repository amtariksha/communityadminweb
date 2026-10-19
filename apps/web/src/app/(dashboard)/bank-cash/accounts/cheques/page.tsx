'use client';

import { type ReactNode } from 'react';
import { ChequesTab } from '../../../bank/cheques-tab';
import { useBankCashData } from '../../use-bank-cash-data';

// Bank & Cash › Bank & Cash Accounts › Cheques (BANK-06).
export default function Page(): ReactNode {
  const { accounts, ledgerAccounts } = useBankCashData();
  return <ChequesTab accounts={accounts} ledgerAccounts={ledgerAccounts} />;
}
