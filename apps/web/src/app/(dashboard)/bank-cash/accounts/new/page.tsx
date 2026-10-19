'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { AddBankAccountForm } from '../../../bank/add-bank-account-form';

// Bank & Cash › Bank & Cash Accounts › Add account as a page (BANK-06,
// SB-07; screen BANK-S11 without petty cash, which is BANK-14).
export default function Page(): ReactNode {
  const router = useRouter();
  const back = () => router.push('/bank-cash/accounts');
  return <AddBankAccountForm mode="page" onClose={back} onSaved={back} />;
}
