import { Suspense, type ReactNode } from 'react';
import { BudgetUpload } from './budget-upload';

// Expense Tracker › Budget › Setup via Excel Upload (EXP-26).
export default function BudgetUploadPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <BudgetUpload />
    </Suspense>
  );
}
