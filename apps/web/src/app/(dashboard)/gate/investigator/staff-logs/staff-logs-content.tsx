'use client';

import { type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { staffLogFiltersToParams, useStaffLogs, type StaffLog, type StaffLogFilters } from '@/hooks/use-gate';
import { DayRangeFilter, REGISTER_PAGE_SIZES, indiaDateTime, registerFilters, useRegisterState } from '../register-kit';

const COLUMNS: DataTableColumn<StaffLog>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.staff_name },
  { key: 'type', header: 'Type', cell: (row) => row.staff_type.replace(/_/g, ' '), className: 'capitalize' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number ?? '—', className: 'whitespace-nowrap' },
  { key: 'in', header: 'In Time', cell: (row) => indiaDateTime(row.check_in_at), className: 'whitespace-nowrap' },
  { key: 'out', header: 'Out Time', cell: (row) => indiaDateTime(row.check_out_at), className: 'whitespace-nowrap' },
  { key: 'by', header: 'Logged By', cell: (row) => row.logged_by_name ?? '—' },
  { key: 'notes', header: 'Notes', cell: (row) => row.notes ?? '—', className: 'max-w-[240px] text-muted-foreground' },
];

/** Gate & Visitors › Incident Investigator › Staff Logs (GATE-S10, GATE-10). */
export function StaffLogsContent(): ReactNode {
  const state = useRegisterState('today');
  const { block: _block, ...range } = registerFilters(state);
  const filters: StaffLogFilters = range;
  const query = useStaffLogs({ ...filters, page: state.page, limit: state.pageSize });

  return (
    <DataTable<StaffLog>
      title="Staff Logs"
      columns={COLUMNS}
      rows={query.data?.data ?? []}
      rowKey={(row) => row.id}
      total={query.data?.total ?? 0}
      page={state.page}
      pageSize={state.pageSize}
      pageSizeOptions={REGISTER_PAGE_SIZES}
      onPageChange={state.setPage}
      onPageSizeChange={state.setPageSize}
      search={{ value: state.q, onChange: state.setQ, placeholder: 'Name or phone' }}
      filters={<DayRangeFilter value={state.range} onChange={state.setRange} />}
      export={{ path: '/gate/staff/logs/export', params: staffLogFiltersToParams(filters) ?? {}, filename: 'staff-logs' }}
      loading={query.isLoading}
      error={query.isError ? query.error : undefined}
      onRetry={() => void query.refetch()}
      emptyText="No staff came in during this period."
    />
  );
}
