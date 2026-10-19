import { type ReactNode } from 'react';
import { ModuleReportsPage } from '@/components/reports/module-reports-page';

export default function AssetReportsPage(): ReactNode {
  return <ModuleReportsPage module="asset_tracker" />;
}
