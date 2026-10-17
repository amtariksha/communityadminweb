import { Suspense, type ReactNode } from 'react';
import NotificationsContent from './notifications-content';

// HelpDesk Tracker › Setup › Notification Alerts (HELP-05).
export default function NotificationAlertsPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <NotificationsContent />
    </Suspense>
  );
}
