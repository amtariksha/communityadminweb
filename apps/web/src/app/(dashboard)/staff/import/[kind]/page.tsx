import { Suspense, type ReactNode } from 'react';
import { StaffImportContent } from './staff-import-content';

// Staff Manager › Bulk Upload Essential · Advanced · Upload Attendance (STAFF-S7, STAFF-35).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <StaffImportContent />
    </Suspense>
  );
}
