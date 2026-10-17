import { Suspense, type ReactNode } from 'react';
import EscalationContent from './escalation-content';

// HelpDesk Tracker › Escalation (HELP-03).
export default function EscalationPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <EscalationContent />
    </Suspense>
  );
}
