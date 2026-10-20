'use client';

import { type ReactNode } from 'react';
import { ReceiptsRegister } from '@/components/income-registers/registers';

// Utility Tracker › Receipts & Invoices › Receipts (UTIL-S8, UTIL-12): the
// receipts that paid a utility invoice, in fetch boxes.
export default function UtilityReceiptsRegisterRoute(): ReactNode {
  return <ReceiptsRegister scope="utility" />;
}
