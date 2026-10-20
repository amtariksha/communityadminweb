'use client';

import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/data-table';
import { EmailStatusCell, emailStatusText } from '@/components/billing-email/email-status-cell';
import { VoidReceiptButton } from '@/app/(dashboard)/receipts/void-receipt-button';
import type { CreditNoteRegisterRow, ReceiptRegisterRow } from '@/hooks/use-income-registers';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AllocationButton, PdfButton } from './register-actions';

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  dd: 'DD',
  upi: 'UPI',
  online: 'Online',
};

/** "B-101", the unit alone, or "—" for a receipt with no unit (direct income, payer). */
export function unitLabel(row: { unit_number?: string | null; block?: string | null }): string {
  if (!row.unit_number) return '—';
  return row.block ? `${row.block}-${row.unit_number}` : row.unit_number;
}

export function receiptPayer(row: ReceiptRegisterRow): string {
  return row.payer_name ?? row.customer_name ?? row.income_account_name ?? '';
}

function ReceiptActions({ row, canWrite }: { row: ReceiptRegisterRow; canWrite: boolean }): ReactNode {
  return (
    <div className="flex flex-wrap gap-1">
      <PdfButton path={`/receipts/${row.id}/pdf`} filename={`${row.receipt_number}.pdf`} />
      <AllocationButton target={{ docType: 'receipt', docId: row.id }} number={row.receipt_number} />
      {canWrite && !row.voided_at && (
        <VoidReceiptButton receiptId={row.id} receiptNumber={row.receipt_number} amount={Number(row.amount)} />
      )}
    </div>
  );
}

/** Columns of the Receipts register (INC-S25). */
export function receiptColumns(canWrite: boolean): DataTableColumn<ReceiptRegisterRow>[] {
  return [
    {
      key: 'number',
      header: 'Receipt No',
      cell: (row) => (
        <span className="font-mono text-xs">
          {row.receipt_number}
          {row.voided_at && (
            <Badge variant="outline" className="ml-2">
              Voided
            </Badge>
          )}
        </span>
      ),
      text: (row) => row.receipt_number,
    },
    { key: 'date', header: 'Date', cell: (row) => formatDate(row.receipt_date) },
    { key: 'unit', header: 'Unit', cell: unitLabel },
    { key: 'payer', header: 'Payer', cell: receiptPayer },
    { key: 'mode', header: 'Mode', cell: (row) => PAYMENT_MODE_LABELS[row.payment_mode] ?? row.payment_mode },
    { key: 'reference', header: 'Payment Number', cell: (row) => row.reference_number ?? '' },
    { key: 'bank', header: 'Bank & Cash Account', cell: (row) => row.bank_account_name ?? '' },
    { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(Number(row.amount)), className: 'text-right' },
    {
      key: 'allocated',
      header: 'Allocated To',
      cell: (row) => (row.allocated_invoices ?? []).map((a) => a.invoice_number).join(', '),
    },
    {
      key: 'email',
      header: 'E-mail status',
      cell: (row) => <EmailStatusCell documentType="receipt" documentId={row.id} status={row.email_status} canSend={canWrite && !row.voided_at} />,
      text: (row) => emailStatusText(row.email_status),
    },
    { key: 'actions', header: 'Actions', cell: (row) => <ReceiptActions row={row} canWrite={canWrite} />, text: () => '' },
  ];
}

const KIND_LABELS: Record<string, string> = {
  specific: 'Specific',
  general: 'General',
  account_specific: 'Account specific',
  interest_waiver: 'Interest waiver',
  cancellation: 'Cancellation',
  // INC-56: a unit's opening advance (Bulk Posting › Upload Opening Balances).
  opening_balance: 'Opening advance',
};

/** Columns of the Credit Notes register (INC-S26). */
export function creditNoteColumns(canWrite: boolean): DataTableColumn<CreditNoteRegisterRow>[] {
  return [
    { key: 'number', header: 'Credit Note No', cell: (row) => <span className="font-mono text-xs">{row.credit_note_number}</span>, text: (row) => row.credit_note_number },
    { key: 'date', header: 'Date', cell: (row) => formatDate(row.credit_note_date ?? row.created_at) },
    { key: 'party', header: 'Unit / Payer', cell: (row) => (row.unit_number ? unitLabel(row) : (row.customer_name ?? '')) },
    { key: 'kind', header: 'Kind', cell: (row) => KIND_LABELS[row.kind ?? ''] ?? row.kind ?? '' },
    { key: 'bills', header: 'Against Bill(s)', cell: (row) => row.against_bills ?? '' },
    { key: 'account', header: 'Account', cell: (row) => row.account_name ?? '' },
    { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(Number(row.amount)), className: 'text-right' },
    { key: 'reason', header: 'Reason', cell: (row) => row.reason },
    {
      key: 'email',
      header: 'E-mail status',
      cell: (row) => <EmailStatusCell documentType="credit_note" documentId={row.id} status={row.email_status} canSend={canWrite} />,
      text: (row) => emailStatusText(row.email_status),
    },
    {
      key: 'actions',
      header: 'PDF',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          <PdfButton path={`/receipts/credit-notes/${row.id}/pdf`} filename={`${row.credit_note_number}.pdf`} />
          <AllocationButton target={{ docType: 'credit_note', docId: row.id }} number={row.credit_note_number} />
        </div>
      ),
      text: () => '',
    },
  ];
}
