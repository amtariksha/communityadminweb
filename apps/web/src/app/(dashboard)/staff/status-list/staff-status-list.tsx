'use client';

import Link from 'next/link';
import { useCallback, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { useRouteStatus } from '@/components/layout/menu/use-route-status';
import { useToast } from '@/components/ui/toast';
import { useDeactivateEmployee, useReactivateEmployee } from '@/hooks';
import { staffFiltersToParams, useChangeStaffStatus } from '@/hooks/use-staff';
import {
  registerParams,
  useChangeDomesticStatus,
  useStaffRegister,
  type RegisterSearchKey,
  type StaffRegisterFilters,
  type StaffRegisterRow,
} from '@/hooks/use-staff-register';
import { currentRole } from '@/lib/current-role';
import { ApiError, friendlyError } from '@/lib/api-error';
import { STAFF_BASE, STAFF_STATUSES, type StaffStatusRoute } from '@/lib/staff-statuses';
import { formatDate } from '@/lib/utils';
import { StaffSearchBy } from '../staff-search';
import { MoveStaffDialog, type StaffMove } from './move-staff-dialog';

const PAGE_SIZES = [25, 50, 100] as const;

type Slug = StaffStatusRoute['slug'];
type Row = StaffRegisterRow;

/** STAFF-S2 columns over the one register (STAFF-42): Type and, for household help, the flats. */
function columnsFor(status: StaffStatusRoute): DataTableColumn<Row>[] {
  const columns: DataTableColumn<Row>[] = [
    { key: 'badge', header: 'Badge No.', cell: (row) => row.badge_no ?? '—' },
    { key: 'name', header: 'Name', cell: (row) => row.name },
    { key: 'category', header: 'Category', cell: (row) => row.category_name },
    { key: 'type', header: 'Type', cell: (row) => (row.kind === 'official' ? 'Official' : 'Domestic') },
    { key: 'units', header: 'Units', cell: (row) => row.units ?? '—' },
    { key: 'phone', header: 'Contact No.', cell: (row) => row.phone ?? '—', className: 'whitespace-nowrap' },
    { key: 'shift', header: 'Shift', cell: (row) => row.shift ?? '—' },
    // STAFF-20: blank when the badge has no expiry (or none yet).
    { key: 'valid-till', header: 'Badge Valid Till', cell: (row) => (row.badge_valid_until ? formatDate(row.badge_valid_until) : '—'), className: 'whitespace-nowrap' },
  ];
  if (status.slug === 'retired' || status.slug === 'blacklisted') {
    columns.push(
      { key: 'reason', header: 'Reason', cell: (row) => row.status_reason ?? '—' },
      { key: 'since', header: 'Since', cell: (row) => formatDate(row.status_changed_at ?? row.exit_date), className: 'whitespace-nowrap' },
    );
  }
  return columns;
}

const editHref = (row: Row): string => (row.kind === 'official' ? `${STAFF_BASE}/${row.id}/edit` : `${STAFF_BASE}/domestic/${row.id}/edit`);

/**
 * STAFF-40 row actions: Move to… (the statuses this one may go to, asking
 * for a reason), Reactivate on Temp and Retired, and Remove from blacklist
 * for the community admin.
 */
function statusActions(status: StaffStatusRoute, open: (move: StaffMove, row: Row) => void, reactivate: (row: Row) => void): DataTableAction<Row>[] {
  const of = (row: Row, to?: StaffMove['to']): StaffMove => ({ id: row.id, name: row.name, from: status.slug, to });
  if (status.slug === 'blacklisted') {
    if (currentRole() !== 'community_admin' && currentRole() !== 'super_admin') return [];
    return [{ key: 'unblacklist', header: 'Remove from blacklist', label: 'Remove', onClick: (row) => open(of(row, 'active'), row) }];
  }
  const actions: DataTableAction<Row>[] = [];
  if (status.slug === 'temp') actions.push({ key: 'reactivate', header: 'Reactivate', label: 'Reactivate', onClick: (row) => open(of(row, 'active'), row) });
  if (status.slug === 'retired') actions.push({ key: 'reactivate', header: 'Reactivate', label: 'Reactivate', onClick: reactivate });
  actions.push({ key: 'move', header: 'Move to…', label: 'Move to…', onClick: (row) => open(of(row), row) });
  return actions;
}

/** Status changes for either store: society staff through /staff, household help through /workers. */
function useStatusChanges() {
  const change = useChangeStaffStatus();
  const changeDomestic = useChangeDomesticStatus();
  const reactivate = useReactivateEmployee();
  const deactivate = useDeactivateEmployee();
  const { addToast } = useToast();

  async function changeStatus(row: Row, input: { id: string; status: Slug; reason?: string }): Promise<void> {
    if (row.kind === 'domestic') {
      await changeDomestic.mutateAsync(input);
    } else {
      try {
        await change.mutateAsync(input);
      } catch (error) {
        // An API without the status route still retires through Deactivate (no reason kept).
        if (!(error instanceof ApiError && error.status === 404 && input.status === 'retired')) throw error;
        await deactivate.mutateAsync(input.id);
      }
    }
    addToast({ title: 'Status changed', variant: 'success' });
  }

  function onReactivate(row: Row): void {
    const toast = {
      onSuccess: () => addToast({ title: 'Reactivated', variant: 'success' }),
      onError: (error: unknown) => addToast({ title: 'Could not change the status', description: friendlyError(error), variant: 'destructive' }),
    };
    if (row.kind === 'domestic') changeDomestic.mutate({ id: row.id, status: 'active' }, toast);
    else reactivate.mutate(row.id, toast);
  }

  return { changeStatus, onReactivate };
}

function StatusList({ status }: { status: StaffStatusRoute }): ReactNode {
  const [q, setQ] = useState('');
  const [searchBy, setSearchBy] = useState<RegisterSearchKey>('any');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const filters: StaffRegisterFilters = { status: status.slug, q: q || undefined, by: searchBy };
  const query = useStaffRegister({ ...filters, page, limit: pageSize });
  const [move, setMove] = useState<{ move: StaffMove; row: Row } | null>(null);
  const { changeStatus, onReactivate } = useStatusChanges();
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);
  // An older API: the society staff list and its export (no household help yet).
  const legacy = query.data?.legacy === true;
  const exportPath = legacy ? '/staff/employees/export' : '/staff/register/export';
  const exportParams = legacy
    ? staffFiltersToParams({ status: status.slug, q: q || undefined, search_by: searchBy === 'unit' ? 'any' : searchBy }) ?? {}
    : registerParams(filters);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{status.heading}</h3>
        {status.slug === 'active' && (
          <Link className="text-sm underline" href={`${STAFF_BASE}/domestic/new`}>
            Add Household Help
          </Link>
        )}
      </div>
      <DataTable<Row>
        title={status.heading}
        columns={columnsFor(status)}
        actions={[
          { key: 'edit', header: 'Edit', label: 'Edit', href: editHref },
          ...statusActions(status, (next, row) => setMove({ move: next, row }), onReactivate),
        ]}
        rows={query.data?.data ?? []}
        rowKey={(row) => `${row.kind}:${row.id}`}
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
        export={{ path: exportPath, params: exportParams, filename: `${status.slug}-staff` }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText={status.emptyText}
      />
      <MoveStaffDialog
        move={move?.move ?? null}
        onClose={() => setMove(null)}
        change={(input) => (move ? changeStatus(move.row, input) : Promise.resolve())}
      />
    </div>
  );
}

/** Staff Manager › Active, Temp, Retired or Blacklisted, whichever the route names (SB-05, STAFF-S2 / S5). */
export function StaffStatusList(): ReactNode {
  const status = useRouteStatus(STAFF_BASE, STAFF_STATUSES);
  if (!status) return null;
  return <StatusList key={status.slug} status={status} />;
}
