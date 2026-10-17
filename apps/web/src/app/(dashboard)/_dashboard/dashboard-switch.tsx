'use client';

import type { ReactNode } from 'react';
import { useAdminLayout } from '@/lib/layout-context';
import DashboardContent from '../dashboard-content';
import { ClassicDashboard } from './classic-dashboard';

/** The classic dashboard for a society on the classic layout; today's page for everyone else. */
export function DashboardSwitch(): ReactNode {
  const layout = useAdminLayout();
  return layout === 'classic' ? <ClassicDashboard /> : <DashboardContent />;
}
