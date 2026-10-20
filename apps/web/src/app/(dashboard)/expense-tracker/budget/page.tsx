import { Suspense, type ReactNode } from 'react';
import { BudgetPage } from './budget-view';

// Expense Tracker › Budget (EXP-22, screen EXP-S13).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <BudgetPage />
    </Suspense>
  );
}
