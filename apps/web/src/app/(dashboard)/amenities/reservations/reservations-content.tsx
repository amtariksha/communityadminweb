'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { FetchPanel, type FetchCriteria } from '@/components/data-table';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAmenities, type Amenity } from '@/hooks';
import {
  useAmenityReservations,
  type AmenityReservation,
  type ReservationStatus,
} from '@/hooks/use-amenity-reservations';
import { CancelBookingDialog } from '../cancel-booking-dialog';
import { monthRange } from '../calendar/calendar-dates';
import { ReservationPanel } from './reservation-panel';

// The states a booking reaches today; Awaiting Payment joins with AMEN-40.
const STATUS_TICKS: ReadonlyArray<{ value: ReservationStatus; label: string }> = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface Applied {
  amenityId: string;
  statuses: ReservationStatus[];
  dateFrom: string;
  dateTo: string;
}

interface ExtraControlsProps {
  amenities: readonly Amenity[];
  amenityId: string;
  statuses: readonly ReservationStatus[];
  onAmenity: (id: string) => void;
  onToggle: (status: ReservationStatus) => void;
}

function ExtraControls(props: ExtraControlsProps): ReactNode {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="reservation-amenity">Amenity</Label>
        <Select id="reservation-amenity" value={props.amenityId} onChange={(e) => props.onAmenity(e.target.value)}>
          <option value="">All Amenities</option>
          {props.amenities.map((amenity) => (
            <option key={amenity.id} value={amenity.id}>
              {amenity.name}
            </option>
          ))}
        </Select>
      </div>
      <fieldset className="flex items-center gap-3">
        <legend className="sr-only">States</legend>
        {STATUS_TICKS.map((tick) => (
          <label key={tick.value} className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={props.statuses.includes(tick.value)} onChange={() => props.onToggle(tick.value)} />
            {tick.label}
          </label>
        ))}
      </fieldset>
    </>
  );
}

/** The count of every state for the applied amenity and dates: one small read of the first panel's state. */
function useCounts(applied: Applied | null): Partial<Record<ReservationStatus, number>> | undefined {
  const probe = useAmenityReservations(
    {
      amenityId: applied?.amenityId ?? '',
      status: applied?.statuses[0] ?? 'confirmed',
      dateFrom: applied?.dateFrom ?? '',
      dateTo: applied?.dateTo ?? '',
    },
    1,
    1,
    applied !== null,
  );
  return applied ? probe.data?.counts : undefined;
}

/**
 * Amenity & Event › Amenity › Amenity Reservations (AMEN-11, screen
 * AMEN-S6): opens empty; Fetch by amenity, state ticks and dates shows one
 * count-headed panel per ticked state, each with its export strip.
 */
export function ReservationsContent(): ReactNode {
  const amenities = useAmenities().data?.data ?? [];
  const range = useMemo(() => {
    const today = new Date();
    return monthRange(today.getFullYear(), today.getMonth());
  }, []);
  const [amenityId, setAmenityId] = useState('');
  const [statuses, setStatuses] = useState<ReservationStatus[]>(['confirmed']);
  const [applied, setApplied] = useState<Applied | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AmenityReservation | null>(null);
  const counts = useCounts(applied);
  const toggle = (status: ReservationStatus) =>
    setStatuses((current) => (current.includes(status) ? current.filter((s) => s !== status) : [...current, status]));

  function fetchReservations(criteria: FetchCriteria): void {
    setApplied({ amenityId, statuses: STATUS_TICKS.map((t) => t.value).filter((s) => statuses.includes(s)), dateFrom: criteria.from, dateTo: criteria.to });
  }

  return (
    <div className="space-y-6">
      <FetchPanel
        title="Fetch reservations"
        range="date"
        initial={{ from: range.date_from, to: range.date_to }}
        extra={<ExtraControls amenities={amenities} amenityId={amenityId} statuses={statuses} onAmenity={setAmenityId} onToggle={toggle} />}
        onFetch={fetchReservations}
      />
      {!applied ? (
        <p className="text-sm text-muted-foreground">Choose filters and press Fetch.</p>
      ) : applied.statuses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tick at least one state and press Fetch.</p>
      ) : (
        applied.statuses.map((status) => (
          <ReservationPanel
            key={`${status}-${applied.amenityId}-${applied.dateFrom}-${applied.dateTo}`}
            filters={{ amenityId: applied.amenityId, status, dateFrom: applied.dateFrom, dateTo: applied.dateTo }}
            count={counts?.[status]}
            onCancel={setCancelTarget}
          />
        ))
      )}
      <CancelBookingDialog booking={cancelTarget} onClose={() => setCancelTarget(null)} />
    </div>
  );
}
