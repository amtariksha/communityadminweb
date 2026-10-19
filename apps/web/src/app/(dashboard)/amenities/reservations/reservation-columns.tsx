'use client';

import Link from 'next/link';
import type { DataTableColumn } from '@/components/data-table';
import type { AmenityReservation } from '@/hooks/use-amenity-reservations';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatBookingStatus } from '../amenity-labels';

const hhmm = (value: string): string => value.slice(0, 5);

/** Amount: the invoice's total when there is one, else the charge and the deposit. */
export function reservationAmount(row: AmenityReservation): number {
  if (row.invoice_total != null) return Number(row.invoice_total);
  return Number(row.total_amount ?? 0) + Number(row.deposit_amount ?? 0);
}

/** The columns of Amenity Reservations (AMEN-S6), in the screen's order (Cancel is a row button). */
export const RESERVATION_COLUMNS: DataTableColumn<AmenityReservation>[] = [
  { key: 'amenity', header: 'Amenity', cell: (row) => row.amenity_name ?? '' },
  { key: 'date', header: 'Date', cell: (row) => formatDate(row.booking_date), className: 'whitespace-nowrap' },
  { key: 'from', header: 'From', cell: (row) => hhmm(row.start_time) },
  { key: 'to', header: 'To', cell: (row) => hhmm(row.end_time) },
  { key: 'block', header: 'Block', cell: (row) => row.block ?? '' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number ?? '' },
  { key: 'by', header: 'Reserved By', cell: (row) => row.member_name ?? '' },
  { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(reservationAmount(row)), className: 'tabular-nums' },
  {
    key: 'paid',
    header: 'Paid',
    cell: (row) => (row.invoice_id ? formatCurrency(Number(row.invoice_paid ?? 0)) : '—'),
    className: 'tabular-nums',
  },
  {
    key: 'invoice',
    header: 'Invoice No.',
    text: (row) => row.invoice_number ?? '',
    cell: (row) =>
      row.invoice_id ? (
        <Link href={`/invoices?focus=${row.invoice_id}`} className="text-primary hover:underline">
          {row.invoice_number ?? 'Invoice'}
        </Link>
      ) : (
        '—'
      ),
  },
  { key: 'status', header: 'Status', cell: (row) => formatBookingStatus(row.status) },
];
