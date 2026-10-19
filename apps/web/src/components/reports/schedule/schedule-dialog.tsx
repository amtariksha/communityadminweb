'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useReportSchedules,
  useSaveSchedule,
  type CatalogueRow,
  type ReportSchedule,
  type ScheduleInput,
} from '@/hooks/use-reports';
import { friendlyError } from '@/lib/api-error';
import { notDeployed } from '../catalogue-state';
import { ScheduleForm } from './schedule-form';
import { ScheduleList } from './schedule-list';

/** The dialog's body: a report's schedules, or the add / edit form. */
export function SchedulePanel({ row, onClose }: { row: CatalogueRow; onClose: () => void }): ReactNode {
  const schedules = useReportSchedules(row.key);
  const save = useSaveSchedule();
  const [editing, setEditing] = useState<ReportSchedule | 'new' | null>(null);

  if (!row.schedulable) return <p className="text-sm text-muted-foreground">This report cannot be scheduled.</p>;
  if (notDeployed(schedules.error)) return <p className="text-sm text-muted-foreground">Scheduling is not available yet.</p>;
  if (editing) {
    const id = editing === 'new' ? undefined : editing.id;
    return (
      <ScheduleForm
        key={id ?? 'new'}
        row={row}
        schedule={editing === 'new' ? undefined : editing}
        busy={save.isPending}
        error={save.error ? friendlyError(save.error) : null}
        onCancel={() => setEditing(null)}
        onSave={(body: Partial<ScheduleInput>) => save.mutate({ id, body }, { onSuccess: () => setEditing(null) })}
      />
    );
  }
  return (
    <div className="space-y-3">
      <ScheduleList schedules={schedules.data ?? []} onEdit={setEditing} />
      <div className="flex gap-2">
        <Button type="button" onClick={() => setEditing('new')}>
          Add schedule
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

/** Schedule Report (REP-S3): the report's schedules above an add / edit form. */
export function ScheduleDialog({
  row,
  open,
  onOpenChange,
}: {
  row: CatalogueRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{`Schedule: ${row.name}`}</DialogTitle>
        </DialogHeader>
        {open && <SchedulePanel row={row} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
