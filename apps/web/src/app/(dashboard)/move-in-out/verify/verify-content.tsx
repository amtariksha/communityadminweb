'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { checklistCount } from '@/components/move-checklist';
import { useMoveIns, type MoveIn } from '@/hooks/use-move-ins';
import { indiaDateTime } from '@/lib/india-time';
import { MOVE_IN_PAGE_SIZES, NOT_AVAILABLE, memberTypeLabel } from '../shared/move-in-cells';
import { MoveInViewDialog } from '../shared/move-in-view-dialog';
import { DecisionDialog, type Decision } from './decision-dialog';

// MOVE-S6.
const COLUMNS: DataTableColumn<MoveIn>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'phone', header: 'Phone', cell: (row) => row.phone, className: 'whitespace-nowrap' },
  { key: 'block', header: 'Block', cell: (row) => row.block ?? '—' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number, className: 'whitespace-nowrap' },
  { key: 'type', header: 'Owner/Tenant', cell: (row) => memberTypeLabel(row) },
  { key: 'requested', header: 'Requested On', cell: (row) => indiaDateTime(row.requested_at), className: 'whitespace-nowrap' },
  { key: 'by', header: 'Requested By', cell: (row) => row.requested_by_name ?? '—' },
  { key: 'checklist', header: 'Checklist', cell: checklistCount, className: 'whitespace-nowrap' },
];

// MOVE-12 — only the people allowed at the row's level (named on it, or
// holding its role) see Approve / Reject.
const notMine = (row: MoveIn): boolean => row.can_act === false;

interface QueueProps {
  level: 1 | 2;
  onView: (moveIn: MoveIn) => void;
  onDecide: (decision: Decision) => void;
}

/** One verification level's queue: its own search and pages. */
function MoveInQueue({ level, onView, onDecide }: QueueProps): ReactNode {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(MOVE_IN_PAGE_SIZES[0]);
  const query = useMoveIns({ state: 'pending', level, q: q || undefined, page, limit: pageSize });
  const notAvailable = query.data === null;
  const title = `All Move Ins - Level ${level}`;
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <DataTable<MoveIn>
        title={title}
        columns={COLUMNS}
        actions={[
          { key: 'view', header: 'Action', label: 'View', onClick: onView },
          { key: 'approve', header: '', label: 'Approve', hidden: notMine, onClick: (row) => onDecide({ kind: 'approve', moveIn: row }) },
          { key: 'reject', header: '', label: 'Reject', hidden: notMine, onClick: (row) => onDecide({ kind: 'reject', moveIn: row }) },
        ]}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.approval_id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={MOVE_IN_PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: q, onChange: onSearch, placeholder: 'Name, phone or unit' }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText={notAvailable ? NOT_AVAILABLE : 'No move-ins waiting at this level.'}
      />
    </section>
  );
}

/**
 * Move In/Out Tracker › Verify Move Ins (MOVE-06, screen MOVE-S6): the
 * society's verification queues, Level 1 then Level 2. A self-signup still
 * waiting for its unit owner is not listed. With the move-in flow off
 * every move-in waits in Level 1; with it on (MOVE-12) the named verifiers
 * of each level see Approve / Reject on that level's rows.
 */
export function VerifyContent(): ReactNode {
  const [viewing, setViewing] = useState<MoveIn | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  return (
    <div className="space-y-6">
      <MoveInQueue level={1} onView={setViewing} onDecide={setDecision} />
      <MoveInQueue level={2} onView={setViewing} onDecide={setDecision} />
      <MoveInViewDialog moveIn={viewing} onClose={() => setViewing(null)} />
      <DecisionDialog decision={decision} onClose={() => setDecision(null)} />
    </div>
  );
}
