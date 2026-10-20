import Link from 'next/link';
import { type ReactNode } from 'react';
import { IncomeSetupPage } from '../setup-page';

// Income Tracker › Setup › Utility Invoicing (INC-S6): a pointer to Utility
// Tracker › Setup, where utility interest, invoicing and meter rules live.
export default function UtilityInvoicingSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Utility Invoicing"
      description="How utility bills are invoiced is set up in the Utility Tracker."
      adminSettings={false}
    >
      <p className="text-sm">
        Utility interest, invoicing choices and meter rules are kept in Utility Tracker ›{' '}
        <Link href="/utilities/setup" className="text-primary hover:underline">
          Setup
        </Link>
        .
      </p>
    </IncomeSetupPage>
  );
}
