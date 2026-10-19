'use client';

import type { DataTableColumn } from '@/components/data-table';
import type { PRListRow } from '@/hooks/use-purchase-requests';
import { formatDate } from '@/lib/utils';
import { prStatusLabel } from '../../purchases/purchase-request/status-labels';

const money = (value: string): string =>
  `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Expense head of the largest line, "+n" when the request has more heads. */
export function headText(row: PRListRow): string {
  if (!row.expense_category_name) return '—';
  return row.extra_heads_count > 0 ? `${row.expense_category_name} +${row.extra_heads_count}` : row.expense_category_name;
}

const PR_NO: DataTableColumn<PRListRow> = { key: 'pr', header: 'PR No.', cell: (row) => row.pr_number, className: 'whitespace-nowrap font-mono text-xs' };
const TITLE: DataTableColumn<PRListRow> = { key: 'title', header: 'Title', cell: (row) => row.title, className: 'max-w-[220px]' };
const AMOUNT: DataTableColumn<PRListRow> = { key: 'amount', header: 'Amount', cell: (row) => money(row.estimated_amount), className: 'text-right tabular-nums' };
const HEAD: DataTableColumn<PRListRow> = { key: 'head', header: 'Expense Category Name', cell: headText };
const VENDOR: DataTableColumn<PRListRow> = { key: 'vendor', header: 'Vendor Name', cell: (row) => row.vendor_name ?? '—' };

/** Open Purchase Request columns (EXP-S4). */
export const OPEN_COLUMNS: DataTableColumn<PRListRow>[] = [
  PR_NO,
  TITLE,
  AMOUNT,
  { key: 'start', header: 'Start Date', cell: (row) => formatDate(row.request_date), className: 'whitespace-nowrap' },
  { key: 'needed', header: 'Approvals Needed', cell: (row) => (row.approvals_needed === null ? '—' : String(row.approvals_needed)), className: 'tabular-nums' },
  HEAD,
  VENDOR,
  { key: 'voted', header: 'Voted', cell: (row) => (row.current_level === null ? '—' : row.voted_by_me ? 'Yes' : 'No') },
];

/** Closed Purchase Request columns (EXP-S5). */
export const CLOSED_COLUMNS: DataTableColumn<PRListRow>[] = [
  PR_NO,
  TITLE,
  { key: 'by', header: 'By', cell: (row) => row.requested_by_name ?? '—' },
  AMOUNT,
  { key: 'created', header: 'Created Date', cell: (row) => formatDate(row.created_at), className: 'whitespace-nowrap' },
  { key: 'approved', header: 'Approved Date', cell: (row) => (row.approved_at ? formatDate(row.approved_at) : '—'), className: 'whitespace-nowrap' },
  HEAD,
  VENDOR,
  { key: 'status', header: 'Status', cell: (row) => prStatusLabel(row.status) },
];
