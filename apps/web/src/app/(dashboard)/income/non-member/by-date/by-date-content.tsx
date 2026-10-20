'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, FetchPanel, type DataTableColumn } from '@/components/data-table';
import { PdfButton } from '@/components/income-registers/register-actions';
import { useNonMemberByDate, type NonMemberEntry } from '@/hooks/use-payer-ledger';
import { isRouteMissing } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';

export const ENTRY_TYPE_LABELS: Readonly<Record<NonMemberEntry['type'], string>> = {
  invoice: 'Invoice',
  receipt: 'Receipt',
  credit_note: 'Credit note',
  direct_income: 'Direct income',
};

/** The document's PDF: invoices, receipts (direct income is a receipt) and credit notes. */
export function entryPdfPath(entry: Pick<NonMemberEntry, 'type' | 'id'>): string {
  if (entry.type === 'invoice') return `/invoices/${entry.id}/pdf`;
  if (entry.type === 'credit_note') return `/receipts/credit-notes/${entry.id}/pdf`;
  return `/receipts/${entry.id}/pdf`;
}

const COLUMNS: DataTableColumn<NonMemberEntry>[] = [
  { key: 'date', header: 'Date', cell: (row) => formatDate(row.date) },
  { key: 'type', header: 'Type', cell: (row) => ENTRY_TYPE_LABELS[row.type] },
  { key: 'number', header: 'Number', cell: (row) => row.number },
  { key: 'payer', header: 'Payer', cell: (row) => row.payer ?? '—' },
  { key: 'account', header: 'Account', cell: (row) => row.account ?? '—' },
  { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(Number(row.amount)), className: 'text-right' },
  { key: 'pdf', header: 'PDF', cell: (row) => <PdfButton path={entryPdfPath(row)} filename={`${row.number}.pdf`} />, text: () => '' },
];

/**
 * Non Member Income › By Date (INC-S31, INC-46): opens empty; Fetch with a
 * From and To date lists every payer invoice, collection, credit note and
 * direct income posted in the period, with its PDF and the export strip.
 */
export function ByDateContent(): ReactNode {
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const query = useNonMemberByDate(range);

  if (isRouteMissing(query.error)) {
    return <p className="text-sm text-muted-foreground">Non Member Income by date is not available yet on this server.</p>;
  }
  const rows = query.data?.data ?? [];
  const panel = (
    <FetchPanel
      title="Fetch non-member income"
      range="date"
      rangeLabel="Date Range"
      requireRange
      busy={query.isFetching}
      onFetch={(criteria) => {
        setRange({ from: criteria.from, to: criteria.to });
        setPage(1);
      }}
    />
  );
  return (
    <DataTable<NonMemberEntry>
      title="Non Member Income by Date"
      columns={COLUMNS}
      rows={rows.slice((page - 1) * pageSize, page * pageSize)}
      rowKey={(row) => `${row.type}:${row.id}`}
      total={rows.length}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      export={range ? { path: '/unit-ledger/non-member/by-date/export', params: range, filename: 'non-member-income-by-date' } : undefined}
      loading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      emptyText="No entries posted in this period."
      fetchMode={{ panel, fetched: range !== null, prompt: 'Choose a From and To date and press Fetch.' }}
    />
  );
}
