import Link from 'next/link';
import type { DataTableColumn } from '@/components/data-table';
import type { Violation } from '@/hooks/use-violation-register';
import { formatDate } from '@/lib/utils';
import { daysLeftText, finalStage, OUTCOME_LABELS, rupees, STAGE_LABELS, unitLabel } from './labels';

/** The columns of each Open Violations list and of Closed Violations (RULE-S4–S6, S9). */
export type ViolationListKind = 'awaiting_approval' | 'warning' | 'penalty' | 'closed';

const common: readonly DataTableColumn<Violation>[] = [
  { key: 'number', header: 'Violation No.', cell: (row) => row.violation_number, className: 'font-medium' },
  { key: 'raised', header: 'Raised On', cell: (row) => formatDate(row.created_at) },
  { key: 'category', header: 'Category', cell: (row) => row.category_title },
  { key: 'unit', header: 'Unit', cell: unitLabel },
];

function daysLeftCell(row: Violation) {
  const text = daysLeftText(row.days_left);
  const over = row.days_left !== null && row.days_left < 0;
  return (
    <span className={over ? 'font-medium text-destructive' : undefined}>
      {text}
      {row.warning_period_over && <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">Warning period over</span>}
    </span>
  );
}

function invoiceCell(row: Violation) {
  if (!row.invoice_number || !row.invoice_id) return '';
  return (
    <Link href={`/invoices?focus=${row.invoice_id}`} className="text-primary underline-offset-2 hover:underline">
      {row.invoice_number}
    </Link>
  );
}

const BY_KIND: Readonly<Record<ViolationListKind, readonly DataTableColumn<Violation>[]>> = {
  awaiting_approval: [
    { key: 'stage', header: 'Requested Stage', cell: (row) => STAGE_LABELS[row.requested_stage] },
    { key: 'level', header: 'Current Level', cell: (row) => (row.current_level ? `Level ${row.current_level}` : '') },
    { key: 'by', header: 'Raised By', cell: (row) => row.raised_by_name ?? '' },
  ],
  warning: [
    { key: 'ends', header: 'Warning Ends On', cell: (row) => (row.warning_ends_on ? formatDate(row.warning_ends_on) : '') },
    { key: 'left', header: 'Days Left', cell: daysLeftCell, text: (row) => daysLeftText(row.days_left) },
  ],
  penalty: [
    { key: 'amount', header: 'Penalty Amount', cell: (row) => rupees(row.penalty_amount) },
    { key: 'gst', header: 'GST', cell: (row) => rupees(row.gst_amount) },
    { key: 'invoice', header: 'Invoice No.', cell: invoiceCell, text: (row) => row.invoice_number ?? '' },
    { key: 'due', header: 'Due Date', cell: (row) => (row.penalty_due_on ? formatDate(row.penalty_due_on) : '') },
    { key: 'balance', header: 'Balance Due', cell: (row) => rupees(row.balance_due) },
  ],
  closed: [
    { key: 'final', header: 'Final Stage', cell: finalStage },
    { key: 'outcome', header: 'Outcome', cell: (row) => (row.close_outcome ? OUTCOME_LABELS[row.close_outcome] : '') },
    { key: 'closed', header: 'Closed On', cell: (row) => (row.closed_at ? formatDate(row.closed_at) : '') },
  ],
};

export function violationColumns(kind: ViolationListKind): DataTableColumn<Violation>[] {
  return [...common, ...BY_KIND[kind]];
}
