import { type ReactNode } from 'react';
import { BillingNotificationsCard } from '../../../settings/billing-notifications-card';
import { IncomeSetupPage } from '../setup-page';

// Income Tracker › Setup › Notifications (INC-S11, INC-30): which billing
// documents are e-mailed. In-app and push notifications are always on.
export default function NotificationsSetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Notifications"
      description="Which invoices, receipts and credit notes are e-mailed, and to whom. Reminders are set on Setup › Defaulters."
    >
      <BillingNotificationsCard />
    </IncomeSetupPage>
  );
}
