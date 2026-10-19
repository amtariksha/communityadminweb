import { type ReactNode } from 'react';
import { PaymentRegisterContent } from '@/app/(dashboard)/purchases/vendor-ledger/payment-register-content';

// Expense Tracker › By Date (EXP-17, screen EXP-S12).
export default function Page(): ReactNode {
  return <PaymentRegisterContent fetchFirst />;
}
