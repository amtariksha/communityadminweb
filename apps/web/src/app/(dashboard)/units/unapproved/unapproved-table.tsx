'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction } from '@/components/data-table';
import {
  unapprovedParams,
  useUnapprovedUsers,
  type BulkApprovalResult,
  type UnapprovedList,
  type UnapprovedRequest,
  type UnapprovedTable as TableKind,
} from '@/hooks/use-unapproved-users';
import { approveColumn, UNAPPROVED_COLUMNS } from './unapproved-columns';

const PAGE_SIZES = [25, 50, 100] as const;

const TABLES: Record<TableKind, { title: string; empty: string; filename: string }> = {
  new: { title: 'Unapproved Users', empty: 'No users are waiting for approval.', filename: 'unapproved-users' },
  join: { title: 'Unapproved Join Unit Requests', empty: 'No join requests are waiting.', filename: 'unapproved-join-requests' },
};

export interface Selection {
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  results: ReadonlyMap<string, BulkApprovalResult>;
}

interface UnapprovedTableProps {
  table: TableKind;
  onView: (approvalId: string) => void;
  /** Table 1 only: the Approve ticks and Edit. */
  selection?: Selection;
  /** The rows on screen, for Select All. */
  onRows?: (rows: readonly UnapprovedRequest[]) => void;
}

function useTableQuery(table: TableKind) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const query = useUnapprovedUsers({ table, search, page, limit: pageSize });
  const onSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  return { query, search, onSearch, page, setPage, pageSize, setPageSize };
}

/** One of the two Unapproved Users tables (UNIT-S1), on the shared data table (SB-04). */
export function UnapprovedTable({ table, onView, selection, onRows }: UnapprovedTableProps): ReactNode {
  const { query, search, onSearch, page, setPage, pageSize, setPageSize } = useTableQuery(table);
  const list: UnapprovedList | undefined = query.data;
  const rows = useMemo(() => list?.data ?? [], [list]);
  useEffect(() => onRows?.(rows), [rows, onRows]);
  const columns = selection ? [...UNAPPROVED_COLUMNS, approveColumn(selection)] : UNAPPROVED_COLUMNS;
  const actions: DataTableAction<UnapprovedRequest>[] = [
    ...(selection
      ? [{ key: 'edit', header: 'Edit', label: 'Edit', href: (row: UnapprovedRequest) => `/units/unapproved/${row.onboarding_id}/edit` }]
      : []),
    { key: 'view', header: 'Details', label: 'View', onClick: (row) => onView(row.approval_id) },
  ];
  const { title, empty, filename } = TABLES[table];

  return (
    <DataTable<UnapprovedRequest>
      title={title}
      columns={columns}
      actions={actions}
      rows={rows}
      rowKey={(row) => row.approval_id}
      total={list?.total ?? 0}
      page={page}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZES}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      search={{ value: search, onChange: onSearch, placeholder: 'Name, phone or unit' }}
      export={{ path: '/units/unapproved/export', params: unapprovedParams({ table, search }), filename }}
      loading={query.isLoading}
      error={query.isError ? query.error : undefined}
      onRetry={() => void query.refetch()}
      emptyText={empty}
    />
  );
}
