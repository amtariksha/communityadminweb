import { type ReactNode } from 'react';
import { ModuleReportsPage } from '@/components/reports/module-reports-page';

export default function BankReportsPage(): ReactNode {
  return <ModuleReportsPage module="bank_cash" />;
}
