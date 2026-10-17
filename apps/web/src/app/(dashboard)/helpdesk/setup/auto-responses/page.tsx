import { Suspense, type ReactNode } from 'react';
import AutoResponsesContent from './auto-responses-content';

// HelpDesk Tracker › Setup › Automated Responses (HELP-06).
export default function AutoResponsesPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <AutoResponsesContent />
    </Suspense>
  );
}
