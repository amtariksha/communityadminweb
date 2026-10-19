import { Suspense, type ReactNode } from 'react';
import ServiceDateContent from './service-date-content';

// HelpDesk Tracker › Setup › Setup Preferred Service Date (HELP-16, screen HELP-S2).
export default function ServiceDatePage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ServiceDateContent />
    </Suspense>
  );
}
