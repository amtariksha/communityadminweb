import { type ReactNode } from 'react';
import { IncomeSetupPage } from '../setup-page';
import { IncomeAccountsContent } from './income-accounts-content';

// Income Tracker › Setup › Income Accounts (INC-S5, INC-38).
export default function IncomeAccountsSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Income Accounts"
      description="What each income account is used for, the order invoice lines print in, and its HSN/SAC."
      adminSettings={false}
    >
      <IncomeAccountsContent />
    </IncomeSetupPage>
  );
}
