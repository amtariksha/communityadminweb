import { type ReactNode } from 'react';
import { KpiDashboardContent } from './kpi-content';

export const metadata = {
  title: 'Operational KPI Command Center | CommunityOS',
  description: 'Enterprise 360-degree real-time operational dashboard across 14 modules',
};

export default function KpiDashboardPage(): ReactNode {
  return <KpiDashboardContent />;
}
