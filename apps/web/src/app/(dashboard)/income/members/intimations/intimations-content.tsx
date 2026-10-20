'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { CountedSelect, DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/layout/page-header';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { intimationProofUrl, usePaymentIntimations, type IntimationFilters, type PaymentIntimation } from '@/hooks/use-payment-intimations';
import { friendlyError } from '@/lib/api-error';
import { useAdminLayout } from '@/lib/layout-context';
import { isRouteMissing } from '@/lib/not-deployed';
import { MemberIncomeLinks } from '../member-income-links';
import { INTIMATIONS_HREF } from '../member-row-actions';
import { ConfirmIntimationDialog, RejectIntimationDialog } from './intimation-dialogs';
import { INTIMATION_COLUMNS, INTIMATION_STATUS_LABELS, intimationActions, type IntimationAction } from './intimation-columns';

const STATUSES = ['pending', 'confirmed', 'rejected'] as const;

function scopeOf(value: string | null): IntimationFilters['scope'] {
  return value === 'utility' || value === 'member' ? value : '';
}

/**
 * Member Income › Paid Intimations (INC-65): payments residents reported
 * from the app, for the office to confirm into a collection or reject.
 * Awaiting confirmation by default; `?scope=utility` from the Utility card.
 */
export function IntimationsContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  const access = useFinanceAccess();
  const { addToast } = useToast();
  const params = useSearchParams();
  const [filters, setFilters] = useState<IntimationFilters>(() => ({ status: 'pending', scope: scopeOf(params.get('scope')), search: '', page: 1, limit: 25 }));
  const [acting, setActing] = useState<{ row: PaymentIntimation; action: 'confirm' | 'reject' } | null>(null);
  const query = usePaymentIntimations(filters);
  const counts = query.data?.counts;
  const change = (patch: Partial<IntimationFilters>) => setFilters((current) => ({ ...current, page: 1, ...patch }));

  async function onAction(row: PaymentIntimation, action: IntimationAction): Promise<void> {
    if (action !== 'proof') return setActing({ row, action });
    try {
      window.open(await intimationProofUrl(row.id), '_blank', 'noopener,noreferrer');
    } catch (error) {
      addToast({ title: 'Could not open the proof', description: friendlyError(error), variant: 'destructive' });
    }
  }

  if (isRouteMissing(query.error)) {
    return <p className="text-sm text-muted-foreground">Paid intimations are not available yet on this server.</p>;
  }
  const controls = (
    <>
      <CountedSelect
        id="intimation-status"
        label="Status"
        value={filters.status}
        onChange={(status) => change({ status: status as IntimationFilters['status'] })}
        allLabel="All"
        options={STATUSES.map((status) => ({ value: status, label: INTIMATION_STATUS_LABELS[status], count: counts?.[status] }))}
      />
      <div className="space-y-1">
        <Label htmlFor="intimation-scope" className="text-xs text-muted-foreground">For</Label>
        <Select id="intimation-scope" value={filters.scope} onChange={(e) => change({ scope: scopeOf(e.target.value) })}>
          <option value="">Maintenance and utility</option>
          <option value="member">Maintenance</option>
          <option value="utility">Utility</option>
        </Select>
      </div>
    </>
  );
  return (
    <div className="space-y-4">
      {!classic && <PageHeader title="Paid Intimations" description="Payments residents reported from the app, for the office to confirm or reject." />}
      <MemberIncomeLinks current={INTIMATIONS_HREF} />
      <DataTable<PaymentIntimation>
        title="Paid Intimations"
        columns={INTIMATION_COLUMNS}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={filters.page}
        pageSize={filters.limit}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
        onPageSizeChange={(limit) => change({ limit })}
        search={{ value: filters.search, onChange: (search) => change({ search }), placeholder: 'Unit or reference' }}
        filters={controls}
        actions={intimationActions(access, (row, action) => void onAction(row, action))}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText="No intimations here."
      />
      {acting?.action === 'confirm' && <ConfirmIntimationDialog row={acting.row} onClose={() => setActing(null)} />}
      {acting?.action === 'reject' && <RejectIntimationDialog row={acting.row} onClose={() => setActing(null)} />}
    </div>
  );
}
