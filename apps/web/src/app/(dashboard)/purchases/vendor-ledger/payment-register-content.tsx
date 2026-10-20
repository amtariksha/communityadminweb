'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable, FetchPanel, type DataTableColumn, type FetchCriteria } from '@/components/data-table';
import { getCurrentTenant, getUser } from '@/lib/auth';
import { currentRole } from '@/lib/current-role';
import { formatCurrency, formatDate } from '@/lib/utils';
import { registerParams, usePaymentRegister, type RegisterFilters, type RegisterRow } from '@/hooks/use-vendor-ledger';
import { ReverseDialog, type ReverseTarget } from './reverse-dialog';

const WRITE_ROLES = new Set(['super_admin', 'community_admin', 'accountant']);

const money = (value: string | null): string => (value && Number(value) ? formatCurrency(value) : '');

const COLUMNS: DataTableColumn<RegisterRow>[] = [
  { key: 'voucher', header: 'Voucher', cell: (r) => r.voucher_number ?? '—' },
  { key: 'date', header: 'Date', cell: (r) => formatDate(r.payment_date) },
  { key: 'posted_by', header: 'Posted By', cell: (r) => r.posted_by_name ?? '—' },
  { key: 'vendor', header: 'Vendor', cell: (r) => r.vendor_name ?? '—' },
  { key: 'invoice', header: 'Invoice', cell: (r) => r.invoices ?? '—' },
  { key: 'amount', header: 'Amount Paid', cell: (r) => formatCurrency(r.amount), className: 'text-right tabular-nums' },
  { key: 'write_off', header: 'Write-Off', cell: (r) => money(r.write_off_amount), className: 'text-right tabular-nums' },
  { key: 'account', header: 'Account', cell: (r) => r.account_name ?? '—' },
  { key: 'instrument', header: 'Instrument No', cell: (r) => r.reference_number ?? '' },
  { key: 'instrument_date', header: 'Instrument Date', cell: (r) => (r.instrument_date ? formatDate(r.instrument_date) : '') },
  { key: 'bank', header: 'Bank A/c GL', cell: (r) => r.bank_ledger ?? '' },
  // The payment's comments, then the comment written beside each invoice it paid.
  { key: 'comments', header: 'Comments', cell: (r) => [r.notes, r.invoice_comments].filter(Boolean).join(' · ') },
];

/** "Reverse" holds the button on a live payment, "Reversed" on a reversed one, "Reversal of PV-…" on a reversal. */
function reverseColumn(canWrite: boolean, open: (target: ReverseTarget) => void): DataTableColumn<RegisterRow> {
  const text = (r: RegisterRow): string => (r.is_reversal ? `Reversal of ${r.reversal_of ?? ''}` : r.is_reversed ? 'Reversed' : '');
  return {
    key: 'reverse',
    header: 'Reverse',
    text,
    cell: (r) =>
      text(r) || (canWrite && r.voucher_number ? (
        <Button type="button" variant="outline" size="sm" onClick={() => open({ kind: 'payment', id: r.id, voucher: r.voucher_number ?? '' })}>
          Reverse
        </Button>
      ) : null),
  };
}

function societyName(): string {
  const tenantId = getCurrentTenant();
  return getUser()?.societies.find((s) => s.id === tenantId)?.name ?? '';
}

function monthStart(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${today.slice(0, 8)}01`;
}

/**
 * Expense Tracker › By Date (EXP-17, screen EXP-S12): one row per payment
 * voucher and per reversal voucher, Reverse on each live payment.
 * `fetchFirst` (classic) opens empty behind the fetch panel (SB-09);
 * the standard tab lists the current month straight away.
 */
export function PaymentRegisterContent({ fetchFirst }: { fetchFirst: boolean }): ReactNode {
  const [filters, setFilters] = useState<RegisterFilters>({ from: monthStart(), page: 1, limit: 25 });
  const [fetched, setFetched] = useState(!fetchFirst);
  const [target, setTarget] = useState<ReverseTarget | null>(null);
  const register = usePaymentRegister(filters, fetched);
  const canWrite = WRITE_ROLES.has(currentRole() ?? '');

  function fetch(criteria: FetchCriteria): void {
    setFilters({ ...filters, from: criteria.from || undefined, to: criteria.to || undefined, page: 1 });
    setFetched(true);
  }

  const panel = (
    <div className="space-y-2">
      <FetchPanel title="Fetch payments" range="date" initial={{ from: filters.from ?? '', to: filters.to ?? '' }} onFetch={fetch} busy={register.isFetching} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={filters.suppressReversals ?? false} onChange={(e) => setFilters({ ...filters, suppressReversals: e.target.checked, page: 1 })} />
        Suppress Reversals
      </label>
    </div>
  );

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{societyName()} — Expenses By Date</h2>
      <DataTable
        title="Expenses By Date"
        rows={register.data?.data ?? []}
        rowKey={(r) => `${r.id}:${r.is_reversal ? 'rev' : 'pay'}`}
        total={register.data?.total ?? 0}
        page={filters.page}
        pageSize={filters.limit}
        onPageChange={(page) => setFilters({ ...filters, page })}
        onPageSizeChange={(limit) => setFilters({ ...filters, limit, page: 1 })}
        search={{ value: filters.search ?? '', onChange: (search) => setFilters({ ...filters, search: search || undefined, page: 1 }) }}
        loading={register.isLoading && fetched}
        error={register.error}
        emptyText="No payments in this period."
        fetchMode={{ panel, fetched }}
        export={{ path: '/purchases/payments/export', params: registerParams(filters), filename: 'expenses-by-date' }}
        columns={[...COLUMNS, reverseColumn(canWrite, setTarget)]}
      />
      <ReverseDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
