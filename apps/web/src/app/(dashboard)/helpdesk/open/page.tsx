import { Suspense, type ReactNode } from 'react';
import { RequestsList } from '../requests-list/requests-list';

// HelpDesk Tracker › Open Requests (HELP-12, screen HELP-S7). The list reads its status from this route.
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <RequestsList />
    </Suspense>
  );
}
