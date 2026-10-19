import { type ReactNode } from 'react';
import { TaxRegistrationCard } from '../../../settings/tax-registration-card';
import { IncomeSetupPage } from '../setup-page';

// Income Tracker › Setup › Customize Invoice (INC-S8): today the tax
// registration block (INC-11). Titles, issuer and footers come with
// INC-39 / INC-40.
export default function CustomizeInvoiceSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Customize Invoice"
      description="Registration numbers printed on invoices, receipts and credit notes."
    >
      <TaxRegistrationCard />
    </IncomeSetupPage>
  );
}
