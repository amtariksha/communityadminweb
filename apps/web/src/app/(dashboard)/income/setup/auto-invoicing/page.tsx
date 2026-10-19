import { type ReactNode } from 'react';
import { IncomeSetupPage } from '../setup-page';
import { AutoInvoicingContent } from './auto-invoicing-content';

// Income Tracker › Setup › Auto Invoicing (INC-S1, INC-17): rule lines per
// unit type, the auto-invoicing form, late payment interest (INC-07) and the
// billing runs (INC-01).
export default function AutoInvoicingSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Auto Invoicing"
      description="How each unit type is billed, and when the billing run raises the invoices."
      adminSettings={false}
    >
      <AutoInvoicingContent />
    </IncomeSetupPage>
  );
}
