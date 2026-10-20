'use client';

import Link from 'next/link';
import type { DataTableColumn } from '@/components/data-table';
import type { EventAttendee } from '@/hooks/use-event-tickets';
import { formatCurrency } from '@/lib/utils';

const money = (value: string | null): string => (value === null ? '—' : formatCurrency(Number(value)));

/** Members Attending (AMEN-S9) in the screen's order; Action is a row button. */
export const ATTENDEE_COLUMNS: DataTableColumn<EventAttendee>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name ?? '' },
  { key: 'unit', header: 'Unit', cell: (row) => [row.block, row.unit_number].filter(Boolean).join('-') },
  { key: 'slot', header: 'Slot Chosen', cell: (row) => row.slot_label ?? '—' },
  { key: 'member', header: 'Member Tickets', cell: (row) => row.member_tickets, className: 'tabular-nums' },
  { key: 'guest', header: 'Guest Tickets', cell: (row) => row.guest_tickets, className: 'tabular-nums' },
  { key: 'amount', header: 'Amount (₹)', cell: (row) => formatCurrency(Number(row.amount)), className: 'tabular-nums' },
  { key: 'paid', header: 'Paid (₹)', cell: (row) => money(row.paid), className: 'tabular-nums' },
  { key: 'remaining', header: 'Remaining (₹)', cell: (row) => money(row.remaining), className: 'tabular-nums' },
  {
    key: 'receipt',
    header: 'Receipt',
    text: (row) => row.receipt_numbers ?? '',
    cell: (row) =>
      row.invoice_id ? (
        <Link href={`/invoices?focus=${row.invoice_id}`} className="text-primary hover:underline">
          {row.receipt_numbers ?? row.invoice_number ?? 'Invoice'}
        </Link>
      ) : (
        '—'
      ),
  },
  { key: 'contact', header: 'Contact No', cell: (row) => row.contact_no ?? '' },
  { key: 'email', header: 'Email', cell: (row) => row.email ?? '' },
];
