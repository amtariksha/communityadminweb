'use client';

import { useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { notDeployed } from '@/components/reports/catalogue-state';
import { ReportsIndex } from '@/components/reports/reports-index';
import { useReportCatalogue } from '@/hooks/use-reports';
import ReportsContent from './reports-content';

/**
 * /reports is the Admin Reports index (decision R1). Today's six views stay
 * for the dashboard's `?report=` links and for an API without the registry.
 */
export function ReportsPageSwitch(): ReactNode {
  const searchParams = useSearchParams();
  const catalogue = useReportCatalogue();
  if (searchParams?.get('report') || notDeployed(catalogue.error)) return <ReportsContent />;
  return <ReportsIndex />;
}
