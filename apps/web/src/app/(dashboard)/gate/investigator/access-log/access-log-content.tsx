'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { useAccessLog, type AccessLogRow } from '@/hooks/use-gate-unlock';
import { REGISTER_PAGE_SIZES, indiaDateTime } from '../register-kit';

const ACTIONS: Readonly<Record<AccessLogRow['action'], string>> = { unlocked: 'Unlocked', viewed: 'Viewed', exported: 'Exported' };

/** The filters an admin used, as "key: value" pairs (empty ones left out). */
export function filtersText(filters: Record<string, unknown>): string {
  return Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${String(value)}`)
    .join(', ');
}

const COLUMNS: DataTableColumn<AccessLogRow>[] = [
  { key: 'at', header: 'Date & Time', cell: (row) => indiaDateTime(row.created_at), className: 'whitespace-nowrap' },
  { key: 'by', header: 'By', cell: (row) => row.user_name ?? '—' },
  { key: 'scope', header: 'Scope', cell: (row) => (row.scope === 'visitors' ? 'Visitors' : 'Vehicles') },
  { key: 'action', header: 'Action', cell: (row) => ACTIONS[row.action] ?? row.action },
  { key: 'filters', header: 'Filters used', cell: (row) => filtersText(row.filters) || '—' },
  { key: 'rows', header: 'Rows returned', cell: (row) => (row.row_count === null ? '—' : String(row.row_count)), className: 'tabular-nums' },
];

/**
 * Investigator access log (GATE-S9): every unlock, read and export of the
 * visitor and vehicle logs while the lock is on. Read only, append-only.
 */
export function AccessLogContent(): ReactNode {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(REGISTER_PAGE_SIZES[0]);
  const query = useAccessLog(page, pageSize);

  if (query.data === null) return <p className="text-sm text-muted-foreground">The access log is not available yet.</p>;

  return (
    <DataTable<AccessLogRow>
      title="Access Log"
      columns={COLUMNS}
      rows={query.data?.data ?? []}
      rowKey={(row) => row.id}
      total={query.data?.total ?? 0}
      page={page}
      pageSize={pageSize}
      pageSizeOptions={REGISTER_PAGE_SIZES}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      loading={query.isLoading}
      error={query.isError ? query.error : undefined}
      onRetry={() => void query.refetch()}
      emptyText="No one has opened the visitor or vehicle log yet."
    />
  );
}
