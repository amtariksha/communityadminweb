'use client';

import { type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { Amenity } from '@/hooks';
import { BOOKING_STATUSES, formatBookingStatus } from '../amenity-labels';

interface StandardFiltersProps {
  amenities: readonly Amenity[];
  amenityId: string;
  status: string;
  onAmenity: (id: string) => void;
  onStatus: (status: string) => void;
  onNewBooking: () => void;
}

/** Today's filter bar: one amenity, a status and New Booking. */
export function StandardCalendarFilters(props: StandardFiltersProps): ReactNode {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="cal-amenity">Amenity</Label>
            <Select id="cal-amenity" value={props.amenityId} onChange={(e) => props.onAmenity(e.target.value)}>
              <option value="">All Amenities</option>
              {props.amenities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cal-status">Status</Label>
            <Select id="cal-status" value={props.status} onChange={(e) => props.onStatus(e.target.value)}>
              <option value="">All</option>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatBookingStatus(s)}
                </option>
              ))}
            </Select>
          </div>
          {/* Next to the filters so a booking is started without scrolling past the calendar. */}
          <div className="ml-auto">
            <Button onClick={props.onNewBooking}>
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AmenityChecksProps {
  amenities: readonly Amenity[];
  hidden: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onAll: () => void;
}

/** Classic (AMEN-S7): every amenity ticked by default; untick to hide its bookings. */
export function AmenityChecks({ amenities, hidden, onToggle, onAll }: AmenityChecksProps): ReactNode {
  return (
    <Card>
      <CardContent className="pt-6">
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <legend className="mb-2 text-sm font-medium">Amenities</legend>
          {amenities.map((amenity) => (
            <label key={amenity.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={!hidden.has(amenity.id)} onChange={() => onToggle(amenity.id)} />
              {amenity.name}
            </label>
          ))}
          <Button type="button" variant="link" size="sm" className="px-0" onClick={onAll}>
            Tick all
          </Button>
        </fieldset>
      </CardContent>
    </Card>
  );
}
