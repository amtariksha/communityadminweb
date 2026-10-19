'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, withCount } from '@/components/data-table';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { UserSearchSelect } from '@/components/ui/user-search-select';
import { useUpdateMomTask } from '@/hooks';
import { taskListParams, useMomTaskList, type MeetingState, type MomTaskRow } from '@/hooks/use-meeting-lists';
import type { UserSearchHit } from '@/hooks/use-user-search';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { taskColumns } from './task-columns';

// governance-meetings.controller.ts MEETING_WRITE_ROLES; the accountant reads.
const TASK_WRITE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member']);

function StateSelect(props: { value: MeetingState; counts?: { open: number; closed: number }; onChange: (state: MeetingState) => void }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor="task-state" className="text-xs text-muted-foreground">
        Status
      </Label>
      <Select id="task-state" value={props.value} onChange={(event) => props.onChange(event.target.value as MeetingState)}>
        <option value="open">{withCount('Open', props.counts?.open)}</option>
        <option value="closed">{withCount('Closed', props.counts?.closed)}</option>
      </Select>
    </div>
  );
}

/**
 * Projects & Meetings › Tasks (PROJ-S11, PROJ-12): one list with a status
 * dropdown whose options carry their counts, Assigned To and Search, Close
 * Task in the first column and Reopen on a closed task.
 */
export function TasksContent(): ReactNode {
  const { addToast } = useToast();
  const update = useUpdateMomTask();
  const [state, setState] = useState<MeetingState>('open');
  const [assignee, setAssignee] = useState<UserSearchHit | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const filters = { state, q: q || undefined, assignee_id: assignee?.id };
  const query = useMomTaskList({ ...filters, page, limit: pageSize });
  const canWrite = TASK_WRITE_ROLES.has(currentRole() ?? '');
  // An API older than PROJ-12 ignores state and paging: narrow here.
  const legacy = query.data !== undefined && query.data.counts === undefined;
  const all = query.data?.data ?? [];
  const rows = legacy ? all.filter((task) => (task.status === 'completed') === (state === 'closed')) : all;

  function setStatus(task: MomTaskRow, status: 'completed' | 'pending'): void {
    if (status === 'completed' && !window.confirm(`Close the task "${task.title}"?`)) return;
    update.mutate(
      { taskId: task.id, data: { status } },
      {
        onSuccess: () => addToast({ title: status === 'completed' ? 'Task closed' : 'Task reopened', variant: 'success' }),
        onError: (error) => addToast({ title: 'Could not change the task', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  const actions: DataTableAction<MomTaskRow>[] = canWrite
    ? [{ key: 'action', header: 'Action', label: 'Reopen', onClick: (task) => setStatus(task, 'pending'), hidden: (task) => task.status !== 'completed' }]
    : [];
  const reset = <T,>(apply: (value: T) => void) => (value: T) => {
    apply(value);
    setPage(1);
  };

  return (
    <DataTable
      title="Tasks"
      columns={taskColumns(canWrite ? (task) => setStatus(task, 'completed') : null, update.isPending ? (update.variables?.taskId ?? null) : null)}
      actions={actions}
      rows={legacy ? rows.slice((page - 1) * pageSize, page * pageSize) : rows}
      rowKey={(task) => task.id}
      total={legacy ? rows.length : (query.data?.total ?? 0)}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={reset(setPageSize)}
      search={{ value: q, onChange: reset(setQ), placeholder: 'Search tasks' }}
      filters={
        <>
          <StateSelect value={state} counts={query.data?.counts} onChange={reset(setState)} />
          <div className="w-56 space-y-1">
            <Label className="text-xs text-muted-foreground">Assigned To</Label>
            <UserSearchSelect scope="tenant" value={assignee} onChange={reset(setAssignee)} placeholder="All Users" />
          </div>
        </>
      }
      export={{ path: '/meetings/tasks/export', params: taskListParams(filters), filename: `${state}-tasks` }}
      loading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      emptyText={state === 'open' ? 'There are no open tasks.' : 'There are no closed tasks.'}
    />
  );
}
