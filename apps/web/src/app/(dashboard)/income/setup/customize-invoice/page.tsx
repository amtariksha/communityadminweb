import { type ReactNode } from 'react';
import { TaxRegistrationCard } from '../../../settings/tax-registration-card';
import { IncomeSetupPage } from '../setup-page';
import { DocumentTitlesCard } from './document-titles-card';
import { RangeSections } from './range-sections';
import { SampleButtons } from './sample-buttons';

// Income Tracker › Setup › Customize Invoice (INC-S8): the tax registration
// block (INC-11), the document titles and issuer (INC-39) and the footers,
// prefix, header title and period wording by number range (INC-40). Each
// card says who may change it.
export default function CustomizeInvoiceSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Customize Invoice"
      description="How invoices, receipts and credit notes look: titles, issuer, registration numbers and footers."
      adminSettings={false}
    >
      <SampleButtons />
      <TaxRegistrationCard />
      <DocumentTitlesCard />
      <RangeSections />
    </IncomeSetupPage>
  );
}
