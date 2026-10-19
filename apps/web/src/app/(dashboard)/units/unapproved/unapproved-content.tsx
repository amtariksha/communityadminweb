'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  useBulkApprove,
  useUnapprovedUsers,
  type BulkApprovalResult,
  type UnapprovedRequest,
} from '@/hooks/use-unapproved-users';
import { ApiError, friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { bulkSummary } from './bulk-summary';
import { RequestViewDialog } from './request-view-dialog';
import { UnapprovedTable } from './unapproved-table';
import { UsersLogStrip } from './users-log-strip';

/** Ticks of table 1 and the outcome of the last Approve Selected Users. */
function useSelection() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [results, setResults] = useState<ReadonlyMap<string, BulkApprovalResult>>(new Map());
  const onToggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  // A row that failed keeps its tick; the others are done with.
  const settle = useCallback((outcome: readonly BulkApprovalResult[]) => {
    setResults(new Map(outcome.map((result) => [result.id, result])));
    setSelected(new Set(outcome.filter((result) => result.status === 'error').map((result) => result.id)));
  }, []);
  return { selected, setSelected, results, onToggle, settle };
}

function SelectionBar(props: {
  count: number;
  busy: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onApprove: () => void;
}): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={props.onSelectAll}>
        Select All
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={props.onDeselectAll}>
        Deselect All
      </Button>
      <Button type="button" size="sm" disabled={props.count === 0 || props.busy} onClick={props.onApprove}>
        {props.busy ? 'Approving…' : `Approve Selected Users${props.count > 0 ? ` (${props.count})` : ''}`}
      </Button>
    </div>
  );
}

/**
 * Units & Users › Unapproved Users (UNIT-S1): residents' self-signups in
 * two tables — people new to the society, and people already living in
 * another unit — with Approve Selected Users, Edit, View / Decline and the
 * Users Log.
 */
export function UnapprovedContent(): ReactNode {
  const { addToast } = useToast();
  const selection = useSelection();
  const visibleRows = useRef<readonly UnapprovedRequest[]>([]);
  const [viewing, setViewing] = useState('');
  const [summary, setSummary] = useState('');
  const bulk = useBulkApprove();
  // The same first page table 1 shows; only read to tell an API without the list.
  const probe = useUnapprovedUsers({ table: 'new', search: '', page: 1, limit: 25 });
  const onRows = useCallback((rows: readonly UnapprovedRequest[]) => {
    visibleRows.current = rows;
  }, []);

  async function approveSelected(): Promise<void> {
    try {
      const outcome = await bulk.mutateAsync(Array.from(selection.selected));
      selection.settle(outcome);
      setSummary(bulkSummary(outcome));
    } catch (error) {
      addToast({ title: 'Could not approve the selected users', description: friendlyError(error), variant: 'destructive' });
    }
  }

  if (isNotDeployed(probe.error)) {
    return <p className="text-sm text-muted-foreground">Unapproved Users is not available yet on this server.</p>;
  }
  if (probe.error instanceof ApiError && probe.error.status === 403) {
    return <p className="text-sm text-muted-foreground">Self-signups are decided by the community admin and the committee.</p>;
  }
  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-label="Unapproved Users">
        <h3 className="text-base font-semibold">Unapproved Users</h3>
        <UnapprovedTable table="new" onView={setViewing} selection={selection} onRows={onRows} />
        <SelectionBar
          count={selection.selected.size}
          busy={bulk.isPending}
          onSelectAll={() => selection.setSelected(new Set(visibleRows.current.map((row) => row.approval_id)))}
          onDeselectAll={() => selection.setSelected(new Set())}
          onApprove={() => void approveSelected()}
        />
        {summary && <p role="status" className="text-sm">{summary}</p>}
      </section>
      <section className="space-y-3" aria-label="Unapproved Join Unit Requests">
        <h3 className="text-base font-semibold">Unapproved Join Unit Requests</h3>
        <UnapprovedTable table="join" onView={setViewing} />
      </section>
      <UsersLogStrip />
      <RequestViewDialog approvalId={viewing} onClose={() => setViewing('')} />
    </div>
  );
}
