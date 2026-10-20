'use client';

import { type ReactNode } from 'react';
import { CreditNotesRegister } from '@/components/income-registers/registers';

// Utility Tracker › Receipts & Invoices › Credit Notes (UTIL-S10, UTIL-12): notes on utility invoices.
export default function UtilityCreditNotesRegisterRoute(): ReactNode {
  return <CreditNotesRegister scope="utility" />;
}
