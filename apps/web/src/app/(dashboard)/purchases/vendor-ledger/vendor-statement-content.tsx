'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TableCell, TableRow } from '@/components/ui/table';
import { statementParams, useVendorStatement, type StatementFilters, type StatementRow, type VendorStatement } from '@/hooks/use-vendor-ledger';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReverseDialog, type ReverseTarget } from './reverse-dialog';
import { CurrentAdvanceTable, CurrentDuesTable } from './statement-tables';

export type StatementTab = 'dues' | 'advance' | 'full';

const COLUMNS: DataTableColumn<StatementRow>[] = [
  { key: 'posted_by', header: 'Posted By', cell: (r) => r.posted_by_name ?? '—' },
  { key: 'invoice_date', header: 'Invoice Date', cell: (r) => (r.invoice_date ? formatDate(r.invoice_date) : formatDate(r.entry_date)) },
  { key: 'invoice_no', header: 'Vendor Invoice No', cell: (r) => r.vendor_invoice_number ?? '—' },
  { key: 'voucher', header: 'Voucher No', cell: (r) => r.voucher_number ?? '—' },
  { key: 'heads', header: 'Expense Head', cell: (r) => r.expense_heads ?? '—' },
  { key: 'comments', header: 'Comments', cell: (r) => r.comments ?? '' },
  { key: 'due', header: 'Due', cell: (r) => (Number(r.due) ? formatCurrency(r.due) : ''), className: 'text-right tabular-nums' },
  { key: 'payment', header: 'Payment', cell: (r) => (Number(r.payment) ? formatCurrency(r.payment) : ''), className: 'text-right tabular-nums' },
];

function reverseTarget(row: StatementRow): ReverseTarget | null {
  if (!row.source_id) return null;
  if (row.can_reverse && (row.kind === 'payment' || row.kind === 'debit_note')) return { kind: row.kind, id: row.source_id, voucher: row.voucher_number ?? '' };
  if (row.can_edit && row.kind === 'invoice') return { kind: 'bill', id: row.source_id, voucher: row.vendor_invoice_number ?? row.voucher_number ?? '' };
  return null;
}

function FullStatement({ vendorId, statement, filters, onFetch, loading }: {
  vendorId: string;
  statement: VendorStatement;
  filters: StatementFilters;
  onFetch: (filters: StatementFilters) => void;
  loading: boolean;
}): ReactNode {
  const [draft, setDraft] = useState<StatementFilters>({ from: statement.from, to: statement.to, showReversals: filters.showReversals });
  const [target, setTarget] = useState<ReverseTarget | null>(null);
  const panel = (
    <form aria-label="Fetch statement" className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); onFetch(draft); }}>
      <div className="space-y-1"><Label htmlFor="stmt-from">From</Label><Input id="stmt-from" type="date" value={draft.from ?? ''} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></div>
      <div className="space-y-1"><Label htmlFor="stmt-to">To</Label><Input id="stmt-to" type="date" value={draft.to ?? ''} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></div>
      <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={draft.showReversals ?? false} onChange={(e) => setDraft({ ...draft, showReversals: e.target.checked })} />Show Reversals</label>
      <Button type="submit" disabled={loading}>Fetch</Button>
    </form>
  );
  return (
    <>
      <p className="text-sm">Opening balance: <span className="font-medium tabular-nums">{formatCurrency(statement.opening_balance)}</span></p>
      <DataTable
        title={`Account statement — ${statement.vendor.name}`}
        columns={COLUMNS}
        rows={statement.rows}
        rowKey={(r) => r.line_id}
        total={statement.rows.length}
        page={1}
        pageSize={Math.max(statement.rows.length, 1)}
        pageSizeOptions={[Math.max(statement.rows.length, 1)]}
        onPageChange={() => undefined}
        emptyText="No transactions in this period."
        loading={loading}
        fetchMode={{ panel, fetched: true }}
        export={{ path: `/purchases/vendors/${vendorId}/statement/export`, params: statementParams(filters), filename: 'vendor-statement' }}
        actions={[{ key: 'reverse', header: 'Reverse', label: (r) => (r.kind === 'invoice' ? 'Cancel' : 'Reverse'), hidden: (r) => reverseTarget(r) === null, onClick: (r) => setTarget(reverseTarget(r)) }]}
        footer={
          <TableRow>
            <TableCell colSpan={7} className="font-medium">Total</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatCurrency(statement.totals.due)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatCurrency(statement.totals.payment)}</TableCell>
            <TableCell />
          </TableRow>
        }
      />
      <p className="text-sm font-medium" data-testid="net-payable">Net payable: {formatCurrency(statement.net)}</p>
      <ReverseDialog target={target} onClose={() => setTarget(null)} />
    </>
  );
}

/**
 * Account statement — <vendor> (EXP-15, screen EXP-S10): Current Dues,
 * Current Advance and the Full Account Statement from the vendor's own
 * ledger, each tab carrying its figure.
 */
export function VendorStatementContent({ vendorId, initialTab = 'dues' }: { vendorId: string; initialTab?: StatementTab }): ReactNode {
  const [tab, setTab] = useState<StatementTab>(initialTab);
  const [filters, setFilters] = useState<StatementFilters>({});
  const query = useVendorStatement(vendorId, filters);
  const statement = query.data;

  if (statement === null) return <p className="text-sm text-muted-foreground">The vendor statement is not available yet on this server.</p>;
  if (!statement) return query.isError ? <p role="alert" className="text-sm text-destructive">The statement could not be loaded.</p> : null;

  const tabs: Array<[StatementTab, string]> = [
    ['dues', `Current Dues (${formatCurrency(statement.current_dues.amount)})`],
    ['advance', `Current Advance (${formatCurrency(statement.current_advance.amount)})`],
    ['full', 'Full Account Statement'],
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Account statement — {statement.vendor.name}</h2>
      <div role="tablist" className="flex flex-wrap gap-2 border-b">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`px-3 py-2 text-sm ${tab === id ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'dues' && <CurrentDuesTable statement={statement} />}
      {tab === 'advance' && <CurrentAdvanceTable statement={statement} />}
      {tab === 'full' && <FullStatement vendorId={vendorId} statement={statement} filters={filters} onFetch={setFilters} loading={query.isFetching} />}
    </div>
  );
}
