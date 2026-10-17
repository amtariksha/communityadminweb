import { Suspense, type ReactNode } from 'react';
import AuditContent from './audit-content';

export default function AuditPage(): ReactNode {
  // AuditContent reads its filter from the link (Show Logs), which needs
  // a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AuditContent />
    </Suspense>
  );
}
