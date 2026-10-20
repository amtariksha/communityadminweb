'use client';

import { useState, type ReactNode } from 'react';
import { CountedSelect, DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { useReceivedCheques, type ChequeFilters, type ReceivedCheque } from '@/hooks/use-received-cheques';
import { todayIST } from '@/lib/date';
import { useAdminLayout } from '@/lib/layout-context';
import { isRouteMissing } from '@/lib/not-deployed';
import { MemberIncomeLinks } from '../member-income-links';
import { CHEQUES_HREF } from '../member-row-actions';
import { ChequeActionDialog } from './cheque-action-dialog';
import { CHEQUE_STATUS_LABELS, chequeActions, chequeColumns, type ChequeAction } from './cheque-columns';
import { RegisterChequeDialog } from './register-cheque-dialog';

const STATUSES = ['pending', 'deposited', 'bounced', 'cancelled'] as const;

/**
 * Member Income › Post-dated Cheques (INC-64): cheques a unit handed over
 * for later months, until they are banked. Pending by default; Due lists
 * those whose date has come. Both layouts.
 */
export function ChequesContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  const access = useFinanceAccess();
  const today = todayIST();
  const [filters, setFilters] = useState<ChequeFilters>({ status: 'pending', search: '', page: 1, limit: 25 });
  const [registering, setRegistering] = useState(false);
  const [acting, setActing] = useState<{ cheque: ReceivedCheque; action: ChequeAction } | null>(null);
  const query = useReceivedCheques(filters);
  const counts = query.data?.counts;
  const change = (patch: Partial<ChequeFilters>) => setFilters((current) => ({ ...current, page: 1, ...patch }));

  if (isRouteMissing(query.error)) {
    return <p className="text-sm text-muted-foreground">Post-dated cheques are not available yet on this server.</p>;
  }
  const statusFilter = (
    <CountedSelect
      id="cheque-status"
      label="Status"
      value={filters.status}
      onChange={(status) => change({ status: status as ChequeFilters['status'] })}
      allLabel="All"
      options={[
        { value: 'due', label: 'Due for deposit', count: counts?.due },
        ...STATUSES.map((status) => ({ value: status, label: CHEQUE_STATUS_LABELS[status], count: counts?.[status] })),
      ]}
    />
  );
  return (
    <div className="space-y-4">
      {!classic && <PageHeader title="Post-dated Cheques" description="Cheques handed over for later months, until they are banked." />}
      <MemberIncomeLinks current={CHEQUES_HREF} />
      {access.canWrite && (
        <Button type="button" onClick={() => setRegistering(true)}>
          Register post-dated cheque
        </Button>
      )}
      <DataTable<ReceivedCheque>
        title="Post-dated Cheques"
        columns={chequeColumns(today)}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={filters.page}
        pageSize={filters.limit}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
        onPageSizeChange={(limit) => change({ limit })}
        search={{ value: filters.search, onChange: (search) => change({ search }), placeholder: 'Cheque no., unit or bank' }}
        filters={statusFilter}
        actions={chequeActions(access, today, (cheque, action) => setActing({ cheque, action }))}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText="No cheques here."
      />
      {registering && <RegisterChequeDialog onClose={() => setRegistering(false)} />}
      {acting && <ChequeActionDialog cheque={acting.cheque} action={acting.action} today={today} onClose={() => setActing(null)} />}
    </div>
  );
}
