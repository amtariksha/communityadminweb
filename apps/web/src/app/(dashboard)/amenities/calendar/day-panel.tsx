'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { Calendar, FileText, ReceiptText, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Amenity, AmenityBooking } from '@/hooks';
import { formatCurrency } from '@/lib/utils';
import { amenityTypeIcon, bookingBillable, bookingStatusVariant, formatAmenityType, formatBookingStatus } from '../amenity-labels';

interface DayPanelProps {
  selectedDate: Date | null;
  bookings: readonly AmenityBooking[];
  amenityById: ReadonlyMap<string, Amenity>;
  generatingId: string | null;
  onGenerateInvoice: (booking: AmenityBooking) => void;
  onCancel: (booking: AmenityBooking) => void;
}

function BookingActions({ booking, props }: { booking: AmenityBooking; props: DayPanelProps }): ReactNode {
  const generating = props.generatingId === booking.id;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {booking.invoice_id ? (
        <Link
          href={`/invoices?focus=${booking.invoice_id}`}
          className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2 text-xs font-medium text-primary hover:bg-accent"
        >
          <ReceiptText className="mr-1 h-3 w-3" />
          Invoice {booking.invoice_number ?? ''}
        </Link>
      ) : (
        booking.status === 'confirmed' &&
        bookingBillable(booking) && (
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled={generating} onClick={() => props.onGenerateInvoice(booking)}>
            <FileText className="mr-1 h-3 w-3" />
            {generating ? 'Generating...' : 'Generate Invoice'}
          </Button>
        )
      )}
      {booking.status === 'confirmed' && (
        <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => props.onCancel(booking)}>
          <X className="mr-1 h-3 w-3" />
          Cancel
        </Button>
      )}
    </div>
  );
}

function BookingCard({ booking, props }: { booking: AmenityBooking; props: DayPanelProps }): ReactNode {
  const amenity = props.amenityById.get(booking.amenity_id);
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {amenity && (
            <span className="text-base" title={formatAmenityType(amenity.amenity_type)}>
              {amenityTypeIcon(amenity.amenity_type)}
            </span>
          )}
          <span className="text-sm font-medium">{booking.amenity_name ?? 'Unknown Amenity'}</span>
        </div>
        <Badge variant={bookingStatusVariant(booking.status)}>{formatBookingStatus(booking.status)}</Badge>
      </div>
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <div>
          {booking.start_time} &mdash; {booking.end_time}
        </div>
        {booking.unit_number && <div>Unit {booking.unit_number}</div>}
        {booking.purpose && <div>{booking.purpose}</div>}
        {booking.total_amount > 0 && <div>{formatCurrency(booking.total_amount)}</div>}
      </div>
      <BookingActions booking={booking} props={props} />
    </div>
  );
}

/** The bookings of the day picked on the calendar, with Invoice and Cancel. */
export function DayPanel(props: DayPanelProps): ReactNode {
  const { selectedDate, bookings } = props;
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          {selectedDate
            ? selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
            : 'Select a Day'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedDate ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Click on a day in the calendar to see bookings.</p>
        ) : bookings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No bookings for this day.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} props={props} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
