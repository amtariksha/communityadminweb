'use client';

import { type ReactNode } from 'react';
import type { DataTableColumn } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import type { MomTaskRow } from '@/hooks/use-meeting-lists';
import { formatDate } from '@/lib/utils';

/**
 * Tasks columns (PROJ-S11 without Task ID, Category and Recurrence, which
 * PROJ-20 / 21 / 46 add): Close Task first, then Date, Created By,
 * Assigned To, Description and Due Date.
 */
export function taskColumns(onClose: ((task: MomTaskRow) => void) | null, busyId: string | null): DataTableColumn<MomTaskRow>[] {
  const closeCell = (task: MomTaskRow): ReactNode => {
    if (task.status === 'completed') return <span className="text-xs text-muted-foreground">Closed</span>;
    if (!onClose) return null;
    return (
      <Button type="button" size="sm" variant="outline" disabled={busyId === task.id} onClick={() => onClose(task)}>
        Close Task
      </Button>
    );
  };
  return [
    { key: 'close', header: 'Close Task', cell: closeCell, text: () => '' },
    { key: 'date', header: 'Date', cell: (task) => formatDate(task.created_at) },
    { key: 'by', header: 'Created By', cell: (task) => task.created_by_name ?? '—' },
    { key: 'assignee', header: 'Assigned To', cell: (task) => task.assignee_name ?? 'Unassigned' },
    {
      key: 'description',
      header: 'Description',
      text: (task) => task.title,
      cell: (task) => (
        <div>
          <p className="font-medium">{task.title}</p>
          {task.description && <p className="line-clamp-1 text-xs text-muted-foreground">{task.description}</p>}
          {task.meeting_title && <p className="text-xs text-muted-foreground">From: {task.meeting_title}</p>}
        </div>
      ),
    },
    { key: 'due', header: 'Due Date', cell: (task) => (task.due_date ? formatDate(task.due_date) : '—') },
  ];
}
