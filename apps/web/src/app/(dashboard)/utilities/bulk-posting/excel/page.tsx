import { Suspense, type ReactNode } from 'react';
import { ExcelContent } from './excel-content';

// Utility Tracker › Bulk Posting › <type> readings to invoices › Invoices using Excel (UTIL-16).
export default function UtilityReadingsUploadPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ExcelContent />
    </Suspense>
  );
}
