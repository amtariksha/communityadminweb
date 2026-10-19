import { type ReactNode } from 'react';
import { BillingGstCard } from '../../../settings/billing-gst-card';
import { IncomeSetupPage } from '../setup-page';

// Income Tracker › Setup › GST (INC-S10, INC-23).
export default function GstSetupPage(): ReactNode {
  return (
    <IncomeSetupPage title="GST" description="Whether an ad-hoc invoice posted for a unit may carry GST.">
      <BillingGstCard />
    </IncomeSetupPage>
  );
}
