import { Suspense, type ReactNode } from 'react';
import { BulkPostingContent } from './bulk-posting-content';

// Utility Tracker › Bulk Posting (UTIL-S7, UTIL-12).
export default function UtilityBulkPostingPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <BulkPostingContent />
    </Suspense>
  );
}
