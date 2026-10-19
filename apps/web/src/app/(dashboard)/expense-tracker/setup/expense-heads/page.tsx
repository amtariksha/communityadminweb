import { Suspense, type ReactNode } from 'react';
import { ExpenseHeadsContent } from './expense-heads-content';

// Expense Tracker › Setup › Expense Heads (EXP-S1, EXP-19).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ExpenseHeadsContent />
    </Suspense>
  );
}
