'use client';

import type { DataTableColumn } from '@/components/data-table';
import { EmailStatusCell, emailStatusText } from '@/components/billing-email/email-status-cell';
import type { InvoiceRegisterRow } from '@/hooks/use-income-registers';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AllocationButton, canReverseInvoice, PdfButton, ReverseInvoiceButton } from './register-actions';
import { unitLabel } from './receipt-columns';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Posted',
  partially_paid: 'Partly paid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Reversed',
};

export function invoicePeriod(row: InvoiceRegisterRow): string {
  if (row.billing_period) return row.billing_period;
  if (row.period_from) return `${formatDate(row.period_from)} – ${formatDate(row.period_to)}`;
  return '';
}

const money = (value: string | number): string => formatCurrency(Number(value));

/** Columns of the Invoices register (INC-S27). */
export function invoiceColumns(canWrite: boolean): DataTableColumn<InvoiceRegisterRow>[] {
  return [
    { key: 'number', header: 'Invoice No', cell: (row) => <span className="font-mono text-xs">{row.invoice_number}</span>, text: (row) => row.invoice_number },
    { key: 'date', header: 'Date', cell: (row) => formatDate(row.invoice_date) },
    { key: 'party', header: 'Unit / Payer', cell: (row) => (row.unit_number ? unitLabel(row) : (row.customer_name ?? '')) },
    { key: 'period', header: 'Period', cell: invoicePeriod },
    { key: 'accounts', header: 'Account(s)', cell: (row) => row.account_names ?? '' },
    { key: 'amount', header: 'Amount', cell: (row) => money(row.subtotal), className: 'text-right' },
    { key: 'gst', header: 'GST', cell: (row) => money(row.gst_amount), className: 'text-right' },
    { key: 'total', header: 'Total', cell: (row) => money(row.total_amount), className: 'text-right' },
    { key: 'paid', header: 'Paid', cell: (row) => money(row.amount_paid), className: 'text-right' },
    { key: 'balance', header: 'Balance', cell: (row) => money(row.balance_due), className: 'text-right' },
    { key: 'status', header: 'Status', cell: (row) => STATUS_LABELS[row.status] ?? row.status },
    {
      key: 'email',
      header: 'E-mail status',
      cell: (row) => (
        <EmailStatusCell documentType="invoice" documentId={row.id} status={row.email_status} canSend={canWrite && row.status !== 'cancelled'} />
      ),
      text: (row) => emailStatusText(row.email_status),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          <PdfButton path={`/invoices/${row.id}/pdf`} filename={`${row.invoice_number}.pdf`} />
          <AllocationButton target={{ docType: 'invoice', docId: row.id }} number={row.invoice_number} label="View" />
          {canWrite && canReverseInvoice(row) && <ReverseInvoiceButton invoiceId={row.id} invoiceNumber={row.invoice_number} />}
        </div>
      ),
      text: () => '',
    },
  ];
}
