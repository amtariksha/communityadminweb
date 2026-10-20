import { Suspense, type ReactNode } from 'react';
import { BudgetSetup } from './budget-setup';

// Expense Tracker › Budget › Setup (EXP-22, screen EXP-S14).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <BudgetSetup />
    </Suspense>
  );
}
