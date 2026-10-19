'use client';

import { type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Amenity, AmenityBooking } from '@/hooks';
import { amenityColor, isSameDay, MONTH_NAMES, toDateKey, WEEKDAY_LABELS, type CalendarDay } from './calendar-dates';

const MAX_VISIBLE = 3;

interface CalendarGridProps {
  year: number;
  month: number;
  days: readonly CalendarDay[];
  today: Date;
  selectedDate: Date | null;
  bookingsByDate: ReadonlyMap<string, AmenityBooking[]>;
  amenityById: ReadonlyMap<string, Amenity>;
  loading: boolean;
  onSelect: (date: Date) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

function MonthHeader(props: Pick<CalendarGridProps, 'year' | 'month' | 'onPrev' | 'onNext' | 'onToday'>): ReactNode {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" aria-label="Previous month" onClick={props.onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {MONTH_NAMES[props.month]} {props.year}
        </h3>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" aria-label="Next month" onClick={props.onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="outline" size="sm" onClick={props.onToday}>
        Today
      </Button>
    </div>
  );
}

function DayCell({ cell, props }: { cell: CalendarDay; props: CalendarGridProps }): ReactNode {
  const dayBookings = props.bookingsByDate.get(toDateKey(cell.date)) ?? [];
  const isToday = isSameDay(cell.date, props.today);
  const isSelected = props.selectedDate !== null && isSameDay(cell.date, props.selectedDate);
  const overflow = dayBookings.length - MAX_VISIBLE;
  return (
    <button
      type="button"
      onClick={() => props.onSelect(cell.date)}
      className={`min-h-[80px] rounded border p-1.5 text-left transition-colors ${
        cell.isCurrentMonth ? 'bg-card hover:bg-accent/50' : 'bg-muted/30 text-muted-foreground/50'
      } ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-border'} ${isToday ? 'border-primary/50' : ''}`}
    >
      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground' : ''}`}>
        {cell.date.getDate()}
      </span>
      {dayBookings.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          {dayBookings.slice(0, MAX_VISIBLE).map((booking) => {
            const amenity = props.amenityById.get(booking.amenity_id);
            return (
              <div key={booking.id} className="flex items-center gap-1 truncate" title={`${booking.amenity_name ?? 'Booking'} ${booking.start_time}-${booking.end_time}`}>
                <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${amenity ? amenityColor(amenity.amenity_type) : 'bg-gray-400'}`} />
                <span className="truncate text-[10px] leading-tight">{booking.amenity_name ?? 'Booking'}</span>
              </div>
            );
          })}
          {overflow > 0 && <span className="text-[10px] text-muted-foreground">+{overflow} more</span>}
        </div>
      )}
    </button>
  );
}

/** The month grid of the reservations calendar, a dot per booking. */
export function CalendarGrid(props: CalendarGridProps): ReactNode {
  return (
    <Card className="lg:col-span-2">
      <CardContent className="pt-6">
        <MonthHeader {...props} />
        <div className="grid grid-cols-7 gap-px">
          {WEEKDAY_LABELS.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {props.loading
            ? Array.from({ length: 42 }).map((_, idx) => (
                <div key={idx} className="min-h-[80px] rounded border border-border p-1">
                  <Skeleton className="mb-1 h-4 w-6" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))
            : props.days.map((cell) => <DayCell key={toDateKey(cell.date)} cell={cell} props={props} />)}
        </div>
      </CardContent>
    </Card>
  );
}
