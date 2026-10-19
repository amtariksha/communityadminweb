'use client';

import { useMemo, type ReactNode } from 'react';
import { currentRole } from '@/lib/current-role';
import { useBankCashData } from '../use-bank-cash-data';
import { BalanceTiles } from './balance-tiles';
import { BankRegisterPanel } from './bank-register';

// PATCH /bank/accounts/:id.
const EDIT_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'accountant']);

/**
 * Bank & Cash › Bank & Cash Accounts › Register (BANK-08, screen BANK-S3):
 * a Book / Bank tile per account, then the register, empty until fetched.
 * Scope choices and search-in are BANK-09.
 */
export function BankCashAccountsPage(): ReactNode {
  const { accounts } = useBankCashData();
  const canEdit = useMemo(() => EDIT_ROLES.has(currentRole() ?? ''), []);
  return (
    <div className="space-y-6">
      <BalanceTiles accounts={accounts} canEdit={canEdit} />
      <BankRegisterPanel accounts={accounts} />
    </div>
  );
}
