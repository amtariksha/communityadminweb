import { type ReactNode } from 'react';
import { BillingGstCard } from '../../../settings/billing-gst-card';
import { GstThresholdYearsCard } from '../../../settings/gst-threshold-years-card';
import { IncomeSetupPage } from '../setup-page';

// Income Tracker › Setup › GST (INC-S10, INC-23, INC-16 follow-up). The
// ad-hoc card is the community admin's (it hides itself for others); the
// year's GST method is also the accountant's, so the page-wide admin note is off.
export default function GstSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="GST"
      adminSettings={false}
      description="Whether an ad-hoc invoice posted for a unit may carry GST, and how each financial year charges GST above ₹7,500 a month."
    >
      <BillingGstCard />
      <GstThresholdYearsCard />
    </IncomeSetupPage>
  );
}
