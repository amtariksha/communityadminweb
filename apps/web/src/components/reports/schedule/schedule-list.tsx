'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReportSchedule } from '@/hooks/use-reports';
import { SCHEDULE_ROLES, frequencyText } from './schedule-form-state';

const INDIA_TIME = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function deliveredTo(schedule: ReportSchedule): string {
  const roles = schedule.recipient_roles.map((role) => SCHEDULE_ROLES.find((option) => option.value === role)?.label ?? role);
  const emails = schedule.recipient_emails.length > 0 ? [`${schedule.recipient_emails.length} other address(es)`] : [];
  return [...roles, ...emails].join(', ') || '—';
}

/** A report's schedules: Frequency · Next Run · Delivered To · Active · Edit (REP-S3). */
export function ScheduleList({
  schedules,
  onEdit,
}: {
  schedules: readonly ReportSchedule[];
  onEdit: (schedule: ReportSchedule) => void;
}): ReactNode {
  if (schedules.length === 0) return <p className="text-sm text-muted-foreground">No schedules yet.</p>;
  return (
    <Table aria-label="Schedules">
      <TableHeader>
        <TableRow>
          <TableHead>Frequency</TableHead>
          <TableHead>Next Run</TableHead>
          <TableHead>Delivered To</TableHead>
          <TableHead>Active</TableHead>
          <TableHead>Edit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((schedule) => (
          <TableRow key={schedule.id}>
            <TableCell>{frequencyText(schedule)}</TableCell>
            <TableCell>{schedule.is_active ? INDIA_TIME.format(new Date(schedule.next_run_at)) : '—'}</TableCell>
            <TableCell>{deliveredTo(schedule)}</TableCell>
            <TableCell>{schedule.is_active ? 'Yes' : 'No'}</TableCell>
            <TableCell>
              <Button type="button" variant="outline" size="sm" onClick={() => onEdit(schedule)}>
                Edit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
