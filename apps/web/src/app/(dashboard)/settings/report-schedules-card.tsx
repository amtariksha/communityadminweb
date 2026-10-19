'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { notDeployed } from '@/components/reports/catalogue-state';
import { frequencyText } from '@/components/reports/schedule/schedule-form-state';
import { useReportCatalogue, useReportSchedules } from '@/hooks/use-reports';
import { AutomatedReportsCard } from './automated-reports-card';

/**
 * Settings › Automated Reports (REP-S7). Since REP-08 every report is
 * scheduled from its own row in Admin Reports; this card lists the
 * society's active schedules. An API from before REP-08 still has the
 * monthly digest, so its card is shown there instead.
 */
export function ReportSchedulesCard(): ReactNode {
  const schedules = useReportSchedules();
  const catalogue = useReportCatalogue();
  if (notDeployed(schedules.error)) return <AutomatedReportsCard />;
  const nameOf = (key: string): string => catalogue.data?.find((row) => row.key === key)?.name ?? key;
  const active = (schedules.data ?? []).filter((schedule) => schedule.is_active);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Automated reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">No report is scheduled. Schedule any report from its row in Admin Reports.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {active.map((schedule) => (
              <li key={schedule.id}>
                <span className="font-medium">{nameOf(schedule.report_key)}</span>
                {` — ${frequencyText(schedule)}`}
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin-reports" className={buttonVariants({ variant: 'outline' })} data-slot="button" data-size="default">
          Open Admin Reports
        </Link>
      </CardContent>
    </Card>
  );
}
