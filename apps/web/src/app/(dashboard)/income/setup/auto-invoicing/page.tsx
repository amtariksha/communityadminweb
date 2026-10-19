import { type ReactNode } from 'react';
import { BillingRunsPanel } from '../../../invoices/billing-runs-panel';
import { BillingRulesCard } from '../../../settings/billing-rules-card';
import { InterestCard } from '../../../settings/interest-card';
import { IncomeSetupPage } from '../setup-page';

// Income Tracker › Setup › Auto Invoicing (INC-S1, INC-34): the rules the
// monthly job bills from, late payment interest (INC-07) and the job's
// runs (INC-01). Rule lines per unit type replace the rules with INC-17.
export default function AutoInvoicingSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Auto Invoicing"
      description="The monthly invoice job raises draft invoices from the active billing rules at 00:01 IST on the 1st."
    >
      <BillingRulesCard />
      <InterestCard />
      <BillingRunsPanel />
    </IncomeSetupPage>
  );
}
