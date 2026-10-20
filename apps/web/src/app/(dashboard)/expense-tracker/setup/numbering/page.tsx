import { type ReactNode } from 'react';
import { CreditDaysCard } from '@/app/(dashboard)/purchases/vendor-ledger/credit-days-card';
import { InputCreditCard } from '@/app/(dashboard)/purchases/vendor-ledger/input-credit-card';
import { NumberingForm } from '@/app/(dashboard)/purchases/vendor-ledger/numbering-form';

// Expense Tracker › Setup › Numbering (EXP-18, screen EXP-S3).
export default function Page(): ReactNode {
  return (
    <div className="space-y-4">
      <NumberingForm />
      <InputCreditCard />
      <CreditDaysCard />
    </div>
  );
}
