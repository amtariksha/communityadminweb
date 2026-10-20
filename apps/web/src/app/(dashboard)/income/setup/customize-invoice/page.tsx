import { type ReactNode } from 'react';
import { TaxRegistrationCard } from '../../../settings/tax-registration-card';
import { IncomeSetupPage } from '../setup-page';
import { DocumentTitlesCard } from './document-titles-card';
import { SampleButtons } from './sample-buttons';

// Income Tracker › Setup › Customize Invoice (INC-S8): the tax registration
// block (INC-11) and the document titles and issuer (INC-39). Each card says
// who may change it.
export default function CustomizeInvoiceSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Customize Invoice"
      description="How invoices, receipts and credit notes look: titles, issuer and registration numbers."
      adminSettings={false}
    >
      <SampleButtons />
      <TaxRegistrationCard />
      <DocumentTitlesCard />
    </IncomeSetupPage>
  );
}
