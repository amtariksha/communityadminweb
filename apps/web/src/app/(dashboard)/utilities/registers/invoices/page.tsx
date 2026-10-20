'use client';

import { type ReactNode } from 'react';
import { InvoicesRegister } from '@/components/income-registers/registers';

// Utility Tracker › Receipts & Invoices › Invoices (UTIL-S9, UTIL-12): utility invoices only.
export default function UtilityInvoicesRegisterRoute(): ReactNode {
  return <InvoicesRegister scope="utility" />;
}
