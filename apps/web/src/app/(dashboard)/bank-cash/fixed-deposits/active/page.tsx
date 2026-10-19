'use client';

import { type ReactNode } from 'react';
import { FixedDepositsTab } from '../../../bank/fixed-deposits-tab';
import { useBankCashData } from '../../use-bank-cash-data';

// Bank & Cash › Fixed Deposits › Active Fixed Deposits (BANK-06, screen BANK-S8).
export default function Page(): ReactNode {
  const { accounts, ledgerAccounts } = useBankCashData();
  return <FixedDepositsTab accounts={accounts} ledgerAccounts={ledgerAccounts} scope="active" />;
}
