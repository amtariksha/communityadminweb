import { type ReactNode } from 'react';
import { ModuleReportsPage } from '@/components/reports/module-reports-page';

export default function LedgerReportsPage(): ReactNode {
  return <ModuleReportsPage module="general_ledger" />;
}
