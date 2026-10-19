import { type ReactNode } from 'react';
import { ModuleReportsPage } from '@/components/reports/module-reports-page';

export default function ProjectsReportsPage(): ReactNode {
  return <ModuleReportsPage module="issue_tracker" />;
}
