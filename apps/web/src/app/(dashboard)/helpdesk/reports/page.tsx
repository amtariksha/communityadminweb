import { type ReactNode } from 'react';
import { ModuleReportsPage } from '@/components/reports/module-reports-page';

export default function HelpdeskReportsPage(): ReactNode {
  return <ModuleReportsPage module="complaint_tracker" />;
}
