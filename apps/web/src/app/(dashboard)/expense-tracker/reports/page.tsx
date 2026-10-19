import { type ReactNode } from 'react';
import { ModuleReportsPage } from '@/components/reports/module-reports-page';

export default function ExpenseReportsPage(): ReactNode {
  return <ModuleReportsPage module="expense_tracker" />;
}
