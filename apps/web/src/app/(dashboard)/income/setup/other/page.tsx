import { type ReactNode } from 'react';
import { IncomeSetupPage } from '../setup-page';
import { OtherContent } from './other-content';

// Income Tracker › Setup › Other (INC-S9): document options and letter head
// (INC-42) and the numbering of each series (INC-41).
export default function OtherSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Other"
      description="Names, payment instructions, letter head and numbering of invoices, receipts and notes."
    >
      <OtherContent />
    </IncomeSetupPage>
  );
}
