import { type ReactNode } from 'react';
import { DuesRemindersCard } from '../../../settings/dues-reminders-card';
import { DefaultersPrivacyCard } from '../../../settings/defaulters-privacy-card';
import { ReminderTemplateCard } from '../../../settings/reminder-template-card';
import { ReminderLogList } from './reminder-log-list';
import { IncomeSetupPage } from '../setup-page';
import { RemindersSummary } from './reminders-summary';

// Income Tracker › Setup › Defaulters (INC-S12): the Defaulters list's
// privacy switches, automatic dues reminders (INC-02) and their text, and
// the reminder log (INC-29 / INC-30).
export default function DefaultersSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Defaulters"
      description="Automatic reminders to units with an invoice past its due date."
    >
      <DefaultersPrivacyCard />
      <RemindersSummary />
      <DuesRemindersCard />
      <ReminderTemplateCard />
      <ReminderLogList />
    </IncomeSetupPage>
  );
}
