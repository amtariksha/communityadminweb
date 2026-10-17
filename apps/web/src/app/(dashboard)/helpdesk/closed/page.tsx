import { Suspense, type ReactNode } from 'react';
import { RequestsList } from '../requests-list/requests-list';

// HelpDesk Tracker › Closed Requests (HELP-12, screen HELP-S8). The list reads its status from this route.
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <RequestsList />
    </Suspense>
  );
}
