'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction } from '@/components/data-table';
import {
  reservationParams,
  useAmenityReservations,
  type AmenityReservation,
  type ReservationFilters,
} from '@/hooks/use-amenity-reservations';
import { RESERVATION_COLUMNS } from './reservation-columns';

const PAGE_SIZES = [25, 50, 100] as const;

const LIVE_STATES: readonly string[] = ['confirmed', 'awaiting_payment'];

export const STATUS_PANEL_TITLES: Record<string, string> = {
  awaiting_payment: 'Reservations Awaiting Payment',
  confirmed: 'Reservations Confirmed',
  cancelled: 'Reservations Cancelled',
};

interface ReservationPanelProps {
  filters: ReservationFilters;
  onCancel: (row: AmenityReservation) => void;
  /** The state's count from the API (SB-04 counts); the panel's own total until it arrives. */
  count?: number;
}

/** One count-headed panel of Amenity Reservations (AMEN-S6): the bookings in one state. */
export function ReservationPanel({ filters, onCancel, count }: ReservationPanelProps): ReactNode {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const query = useAmenityReservations(filters, page, pageSize);
  const title = STATUS_PANEL_TITLES[filters.status] ?? filters.status;
  const total = query.data?.total ?? 0;
  // A live booking — confirmed or still waiting for payment — can be cancelled.
  const actions: DataTableAction<AmenityReservation>[] = LIVE_STATES.includes(filters.status)
    ? [{ key: 'cancel', header: 'Cancel', label: 'Cancel', onClick: onCancel, hidden: (row) => !LIVE_STATES.includes(row.status) }]
    : [];

  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="text-base font-semibold">
        {count ?? total} {title}
      </h3>
      <DataTable<AmenityReservation>
        title={title}
        columns={RESERVATION_COLUMNS}
        actions={actions}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={total}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        export={{
          path: '/amenities/bookings/export',
          params: reservationParams(filters),
          filename: `amenity-reservations-${filters.status}`,
        }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="No reservations."
      />
    </section>
  );
}
