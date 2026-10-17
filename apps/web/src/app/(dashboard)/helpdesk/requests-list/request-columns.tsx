'use client';

import type { DataTableColumn } from '@/components/data-table';
import type { Ticket } from '@/hooks';
import type { AdminLayout } from '@/lib/admin-layout';
import { ticketStatusLabel } from '@/lib/ticket-status';
import { formatDate } from '@/lib/utils';
import { requestAgeDays } from '../../tickets/ticket-badges';

/**
 * The columns of Open Requests and Closed Requests (HELP-S7, S8), in the
 * screen's order. "Request" is the subject (the first line); Preferred
 * Service Date joins with HELP-16.
 */
export function requestColumns(layout: AdminLayout, word: (standard: string) => string): DataTableColumn<Ticket>[] {
  return [
    { key: 'number', header: word('Ticket #'), cell: (row) => row.ticket_number, className: 'font-mono text-xs' },
    { key: 'category', header: 'Category', cell: (row) => row.category },
    { key: 'request', header: 'Request', cell: (row) => row.subject, className: 'max-w-[240px]' },
    { key: 'opened', header: 'Opened On', cell: (row) => formatDate(row.created_at) },
    { key: 'by', header: 'By', cell: (row) => row.created_by_name ?? '—' },
    { key: 'unit', header: 'Unit', cell: (row) => row.unit_number ?? '—' },
    { key: 'status', header: 'Status', cell: (row) => ticketStatusLabel(row.status, layout) },
    {
      key: 'last-update',
      header: 'Last update',
      cell: (row) => row.last_comment_text ?? '—',
      className: 'max-w-[240px] text-muted-foreground',
    },
    { key: 'updated', header: 'Updated On', cell: (row) => formatDate(row.updated_at) },
    { key: 'days', header: 'Days', cell: (row) => requestAgeDays(row), className: 'tabular-nums' },
  ];
}
