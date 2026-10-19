'use client';

import { useState, type ReactNode } from 'react';
import { CountedSelect, DataTable, type DataTableColumn } from '@/components/data-table';
import { useToast } from '@/components/ui/toast';
import { useOverstayAlerts, useResolveOverstayAlert, type OverstayAlert } from '@/hooks/use-overstay';
import { friendlyError } from '@/lib/api-error';
import { REGISTER_PAGE_SIZES, indiaDateTime } from '../register-kit';

const SUBJECTS: Readonly<Record<string, string>> = { visitor: 'Visitor', staff: 'Staff', vehicle: 'Vehicle' };

const COLUMNS: DataTableColumn<OverstayAlert>[] = [
  { key: 'entered', header: 'Entered At', cell: (row) => indiaDateTime(row.entered_at), className: 'whitespace-nowrap' },
  { key: 'subject', header: 'Subject', cell: (row) => SUBJECTS[row.subject_type] ?? row.subject_type },
  { key: 'name', header: 'Name', cell: (row) => row.label ?? '—' },
  {
    key: 'unit',
    header: 'Unit',
    cell: (row) => [row.block, row.unit_number].filter(Boolean).join('-') || '—',
    className: 'whitespace-nowrap',
  },
  { key: 'minutes', header: 'Minutes Inside', cell: (row) => String(row.minutes_inside), className: 'tabular-nums' },
  { key: 'limit', header: 'Limit', cell: (row) => String(row.threshold_minutes), className: 'tabular-nums' },
  { key: 'status', header: 'Status', cell: (row) => (row.status === 'open' ? 'Open' : 'Resolved') },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
];

/**
 * Gate & Visitors › Incident Investigator › Overstays (GATE-S10, GATE-10):
 * the overstay alert ledger the 15-minute sweep writes, open ones first,
 * each with Resolve.
 */
export function OverstaysContent(): ReactNode {
  const [status, setStatus] = useState<'' | 'open' | 'resolved'>('open');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(REGISTER_PAGE_SIZES[0]);
  const query = useOverstayAlerts({ status: status || undefined, page, limit: pageSize });
  const resolve = useResolveOverstayAlert();
  const { addToast } = useToast();
  const rows = query.data?.data ?? [];

  async function onResolve(row: OverstayAlert): Promise<void> {
    try {
      await resolve.mutateAsync(row.id);
      addToast({ title: 'Overstay resolved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not resolve', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <DataTable<OverstayAlert>
      title="Overstays"
      columns={COLUMNS}
      actions={[
        { key: 'resolve', header: 'Resolve', label: 'Resolve', onClick: (row) => void onResolve(row), hidden: (row) => row.status !== 'open' },
      ]}
      rows={rows}
      rowKey={(row) => row.id}
      // An older server sends the list without a total.
      total={query.data?.total ?? rows.length}
      page={page}
      pageSize={pageSize}
      pageSizeOptions={REGISTER_PAGE_SIZES}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      filters={
        <CountedSelect
          id="overstay-status"
          label="Status"
          value={status}
          allLabel="All"
          options={STATUS_OPTIONS}
          onChange={(value) => {
            setStatus(value as '' | 'open' | 'resolved');
            setPage(1);
          }}
        />
      }
      loading={query.isLoading}
      error={query.isError ? query.error : undefined}
      onRetry={() => void query.refetch()}
      emptyText="No one has stayed past the limit."
    />
  );
}
