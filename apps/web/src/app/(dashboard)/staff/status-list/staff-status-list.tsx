'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { useRouteStatus } from '@/components/layout/menu/use-route-status';
import { useToast } from '@/components/ui/toast';
import { useDeactivateEmployee, useReactivateEmployee, useStaffEmployees } from '@/hooks';
import { staffFiltersToParams, type Staff, type StaffFilters, type StaffSearchKey } from '@/hooks/use-staff';
import { friendlyError } from '@/lib/api-error';
import { STAFF_BASE, STAFF_STATUSES, type StaffStatusRoute } from '@/lib/staff-statuses';
import { formatDate } from '@/lib/utils';
import { staffTypeLabel } from '../staff-fields';
import { StaffSearchBy } from '../staff-search';

const PAGE_SIZES = [25, 50, 100] as const;

function columnsFor(status: StaffStatusRoute): DataTableColumn<Staff>[] {
  const columns: DataTableColumn<Staff>[] = [
    { key: 'badge', header: 'Badge No.', cell: (row) => row.badge_no ?? '—' },
    { key: 'name', header: 'Name', cell: (row) => row.name },
    { key: 'category', header: 'Category', cell: (row) => staffTypeLabel(row.staff_type) },
    { key: 'designation', header: 'Designation', cell: (row) => row.designation ?? '—' },
    { key: 'phone', header: 'Contact No.', cell: (row) => row.phone, className: 'whitespace-nowrap' },
    { key: 'joined', header: 'Join Date', cell: (row) => formatDate(row.join_date), className: 'whitespace-nowrap' },
    // STAFF-20: blank when the badge has no expiry (or none yet).
    { key: 'valid-till', header: 'Badge Valid Till', cell: (row) => (row.badge_valid_until ? formatDate(row.badge_valid_until) : '—'), className: 'whitespace-nowrap' },
  ];
  if (status.slug === 'retired') {
    columns.push({ key: 'since', header: 'Since', cell: (row) => formatDate(row.exit_date), className: 'whitespace-nowrap' });
  }
  return columns;
}

/** Retire on Active (today's Deactivate), Reactivate on Retired. */
function useStatusAction(status: StaffStatusRoute): DataTableAction<Staff> {
  const { addToast } = useToast();
  const deactivate = useDeactivateEmployee();
  const reactivate = useReactivateEmployee();
  const done = (title: string) => ({
    onSuccess: () => addToast({ title, variant: 'success' as const }),
    onError: (error: unknown) => addToast({ title: 'Could not change the status', description: friendlyError(error), variant: 'destructive' as const }),
  });
  if (status.slug === 'active') {
    return {
      key: 'retire',
      header: 'Retire',
      label: 'Retire',
      onClick: (row) => {
        if (window.confirm(`Move ${row.name} to Retired?`)) deactivate.mutate(row.id, done('Moved to Retired'));
      },
    };
  }
  return { key: 'reactivate', header: 'Reactivate', label: 'Reactivate', onClick: (row) => reactivate.mutate(row.id, done('Reactivated')) };
}

function StatusList({ status }: { status: StaffStatusRoute }): ReactNode {
  const [q, setQ] = useState('');
  const [searchBy, setSearchBy] = useState<StaffSearchKey>('any');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const filters: StaffFilters = { status: status.slug, q: q || undefined, search_by: searchBy };
  const query = useStaffEmployees({ ...filters, page, limit: pageSize });
  const statusAction = useStatusAction(status);
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">{status.heading}</h3>
      <DataTable<Staff>
        title={status.heading}
        columns={columnsFor(status)}
        actions={[{ key: 'edit', header: 'Edit', label: 'Edit', href: (row) => `${STAFF_BASE}/${row.id}/edit` }, statusAction]}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: q, onChange: onSearch, placeholder: 'Search staff' }}
        filters={<StaffSearchBy value={searchBy} onChange={(key) => { setSearchBy(key); setPage(1); }} />}
        export={{ path: '/staff/employees/export', params: staffFiltersToParams(filters) ?? {}, filename: `${status.slug}-staff` }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText={status.emptyText}
      />
    </div>
  );
}

/** Staff Manager › Active or › Retired, whichever the route names (SB-05, STAFF-S2 / S5). */
export function StaffStatusList(): ReactNode {
  const status = useRouteStatus(STAFF_BASE, STAFF_STATUSES);
  if (!status) return null;
  return <StatusList key={status.slug} status={status} />;
}
