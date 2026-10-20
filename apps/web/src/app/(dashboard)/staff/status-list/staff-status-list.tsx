'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { useRouteStatus } from '@/components/layout/menu/use-route-status';
import { useToast } from '@/components/ui/toast';
import { useDeactivateEmployee, useReactivateEmployee, useStaffEmployees } from '@/hooks';
import { staffFiltersToParams, useChangeStaffStatus, type Staff, type StaffFilters, type StaffSearchKey } from '@/hooks/use-staff';
import { currentRole } from '@/lib/current-role';
import { ApiError, friendlyError } from '@/lib/api-error';
import { STAFF_BASE, STAFF_STATUSES, type StaffStatusRoute } from '@/lib/staff-statuses';
import { formatDate } from '@/lib/utils';
import { staffTypeLabel } from '../staff-fields';
import { StaffSearchBy } from '../staff-search';
import { MoveStaffDialog, type StaffMove } from './move-staff-dialog';

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
  if (status.slug === 'retired' || status.slug === 'blacklisted') {
    columns.push(
      { key: 'reason', header: 'Reason', cell: (row) => row.status_reason ?? '—' },
      {
        key: 'since',
        header: 'Since',
        cell: (row) => formatDate(row.status_changed_at ?? row.exit_date),
        className: 'whitespace-nowrap',
      },
    );
  }
  return columns;
}

/**
 * STAFF-40 row actions: Move to… (the statuses this one may go to, asking
 * for a reason), Reactivate on Temp and Retired, and Remove from blacklist
 * for the community admin.
 */
function statusActions(status: StaffStatusRoute, open: (move: StaffMove) => void, reactivate: (row: Staff) => void): DataTableAction<Staff>[] {
  const of = (row: Staff, to?: StaffMove['to']): StaffMove => ({ id: row.id, name: row.name, from: status.slug, to });
  if (status.slug === 'blacklisted') {
    if (currentRole() !== 'community_admin' && currentRole() !== 'super_admin') return [];
    return [{ key: 'unblacklist', header: 'Remove from blacklist', label: 'Remove', onClick: (row) => open(of(row, 'active')) }];
  }
  const actions: DataTableAction<Staff>[] = [];
  if (status.slug === 'temp') actions.push({ key: 'reactivate', header: 'Reactivate', label: 'Reactivate', onClick: (row) => open(of(row, 'active')) });
  if (status.slug === 'retired') actions.push({ key: 'reactivate', header: 'Reactivate', label: 'Reactivate', onClick: reactivate });
  actions.push({ key: 'move', header: 'Move to…', label: 'Move to…', onClick: (row) => open(of(row)) });
  return actions;
}

function StatusList({ status }: { status: StaffStatusRoute }): ReactNode {
  const [q, setQ] = useState('');
  const [searchBy, setSearchBy] = useState<StaffSearchKey>('any');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const filters: StaffFilters = { status: status.slug, q: q || undefined, search_by: searchBy };
  const query = useStaffEmployees({ ...filters, page, limit: pageSize });
  const [move, setMove] = useState<StaffMove | null>(null);
  const change = useChangeStaffStatus();
  const reactivate = useReactivateEmployee();
  const deactivate = useDeactivateEmployee();
  const { addToast } = useToast();
  const onReactivate = (row: Staff) =>
    reactivate.mutate(row.id, {
      onSuccess: () => addToast({ title: 'Reactivated', variant: 'success' }),
      onError: (error) => addToast({ title: 'Could not change the status', description: friendlyError(error), variant: 'destructive' }),
    });
  async function changeStatus(input: { id: string; status: StaffStatusRoute['slug']; reason?: string }): Promise<void> {
    try {
      await change.mutateAsync(input);
    } catch (error) {
      // An API without the status route still retires through Deactivate (no reason kept).
      if (!(error instanceof ApiError && error.status === 404 && input.status === 'retired')) throw error;
      await deactivate.mutateAsync(input.id);
    }
    addToast({ title: 'Status changed', variant: 'success' });
  }
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
        actions={[
          { key: 'edit', header: 'Edit', label: 'Edit', href: (row) => `${STAFF_BASE}/${row.id}/edit` },
          ...statusActions(status, setMove, onReactivate),
        ]}
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
      <MoveStaffDialog move={move} onClose={() => setMove(null)} change={changeStatus} />
    </div>
  );
}

/** Staff Manager › Active, Temp, Retired or Blacklisted, whichever the route names (SB-05, STAFF-S2 / S5). */
export function StaffStatusList(): ReactNode {
  const status = useRouteStatus(STAFF_BASE, STAFF_STATUSES);
  if (!status) return null;
  return <StatusList key={status.slug} status={status} />;
}
