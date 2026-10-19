'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { moveInParams, useMoveIns, type MoveIn, type MoveInFilters } from '@/hooks/use-move-ins';
import { todayIST } from '@/lib/date';
import { indiaDate } from '@/lib/india-time';
import { DayRangeFilter, type DayRange } from '@/components/day-range-filter';
import { MOVE_IN_PAGE_SIZES, NOT_AVAILABLE, memberTypeLabel } from '../shared/move-in-cells';
import { MoveInViewDialog } from '../shared/move-in-view-dialog';

const COLUMNS: DataTableColumn<MoveIn>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'block', header: 'Block', cell: (row) => row.block ?? '—' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number, className: 'whitespace-nowrap' },
  { key: 'type', header: 'Owner/Tenant', cell: (row) => memberTypeLabel(row) },
  { key: 'approved', header: 'Approved On', cell: (row) => indiaDate(row.approved_at), className: 'whitespace-nowrap' },
  { key: 'by', header: 'Approved By', cell: (row) => row.approved_by_name ?? '—' },
  { key: 'account', header: 'Account', cell: (row) => (row.account_created ? 'Created' : 'Not yet') },
];

/** The last 90 days, India days (MOVE-S7's default). */
export function last90Days(today: string = todayIST()): DayRange {
  const from = new Date(`${today}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 90);
  return { from: from.toISOString().slice(0, 10), to: today };
}

/**
 * Move In/Out Tracker › Approved Move Ins (MOVE-06, screen MOVE-S7): "User
 * Account Created" — approved onboardings and self-signups, last 90 days by
 * default, with who approved and whether the person has an account.
 */
export function ApprovedContent(): ReactNode {
  const [range, setRange] = useState<DayRange>(() => last90Days());
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(MOVE_IN_PAGE_SIZES[0]);
  const [viewing, setViewing] = useState<MoveIn | null>(null);
  const filters: MoveInFilters = { state: 'approved', from: range.from || undefined, to: range.to || undefined, q: q || undefined };
  const query = useMoveIns({ ...filters, page, limit: pageSize });
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">User Account Created</h3>
      <DataTable<MoveIn>
        title="Approved Move Ins"
        columns={COLUMNS}
        actions={[{ key: 'view', header: 'View', label: 'View', onClick: setViewing }]}
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
        filters={
          <DayRangeFilter
            value={range}
            onChange={(next) => {
              setRange(next);
              setPage(1);
            }}
          />
        }
        export={{ path: '/tenant-lifecycle/move-ins/export', params: moveInParams(filters), filename: 'approved-move-ins' }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText={query.data === null ? NOT_AVAILABLE : 'No approved move-ins in this period.'}
      />
      <MoveInViewDialog moveIn={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
