import { type ReactNode } from 'react';
import { IncomeSetupPage } from '../setup-page';
import { OtherContent } from './other-content';

// Income Tracker › Setup › Other (INC-S9, INC-42).
export default function OtherSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Other"
      description="Names, payment instructions and letter head printed on invoices and receipts."
    >
      <OtherContent />
    </IncomeSetupPage>
  );
}
