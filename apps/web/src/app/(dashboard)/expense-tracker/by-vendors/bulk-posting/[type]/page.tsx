import { Suspense, type ReactNode } from 'react';
import { ImportJob } from './import-job';

// Expense Tracker › By Vendors › Bulk Posting › one job (EXP-26).
export default function ExpenseImportJobPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ImportJob />
    </Suspense>
  );
}
