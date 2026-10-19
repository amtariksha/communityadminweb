import { type ReactNode } from 'react';
import { DuesRemindersCard } from '../../../settings/dues-reminders-card';
import { IncomeSetupPage } from '../setup-page';
import { RemindersSummary } from './reminders-summary';

// Income Tracker › Setup › Defaulters (INC-S12): automatic dues reminders
// (INC-02). The phone / e-mail switches and the reminder log come with
// INC-29 / INC-30.
export default function DefaultersSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Defaulters"
      description="Automatic reminders to units with an invoice past its due date."
    >
      <RemindersSummary />
      <DuesRemindersCard />
    </IncomeSetupPage>
  );
}
