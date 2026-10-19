'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';
import { useCreateBooking, useUnitMembers } from '@/hooks';
import type { Amenity } from '@/hooks';
import { useUnitChoices } from '../helpdesk/new/use-unit-choices';
import { BookingChargePreview } from './booking-charge-preview';

/**
 * The admin books an amenity on behalf of a resident: unit first, then a
 * member of that unit. The API charges the booking by the amenity's
 * pricing and, for a paid amenity, raises and posts its invoice in the
 * same request (AMEN-03: there is no separate "generate invoice" step).
 */

interface NewBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amenities: Amenity[];
  defaultDate: string;
}

interface BookingForm {
  amenityId: string;
  unitId: string;
  memberId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  guestsCount: string;
}

const TIME = /^\d{2}:\d{2}$/;

function emptyForm(date: string): BookingForm {
  return {
    amenityId: '', unitId: '', memberId: '', bookingDate: date,
    startTime: '09:00', endTime: '10:00', purpose: '', guestsCount: '0',
  };
}

export function validateBookingForm(form: BookingForm): string | null {
  if (!form.amenityId) return 'Please pick an amenity.';
  if (!form.unitId) return 'Please pick a unit.';
  if (!form.memberId) return 'Please pick a member.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.bookingDate)) return 'Date must be YYYY-MM-DD.';
  if (!TIME.test(form.startTime) || !TIME.test(form.endTime)) return 'Times must be HH:MM.';
  if (form.startTime >= form.endTime) return 'End time must be after start time.';
  return null;
}

/** The success message names the invoice when the API raised one. */
export function bookingCreatedToast(invoiceNumber: string | null | undefined): {
  title: string;
  description?: string;
} {
  if (invoiceNumber) {
    return {
      title: `Booking + invoice ${invoiceNumber} created`,
      description: 'The invoice is posted to the resident’s account.',
    };
  }
  return { title: 'Booking created' };
}

export function NewBookingDialog({
  open,
  onOpenChange,
  amenities,
  defaultDate,
}: NewBookingDialogProps): ReactNode {
  const { addToast } = useToast();
  const createBooking = useCreateBooking();
  const [form, setForm] = useState<BookingForm>(() => emptyForm(defaultDate));
  const set = (patch: Partial<BookingForm>) => setForm((prev) => ({ ...prev, ...patch }));

  // Reset whenever the dialog opens, so a previous booking's values never linger.
  useEffect(() => {
    if (open) setForm(emptyForm(defaultDate));
  }, [open, defaultDate]);

  function handleSubmit(): void {
    const err = validateBookingForm(form);
    if (err) {
      addToast({ title: err, variant: 'destructive' });
      return;
    }
    const guests = Number(form.guestsCount || 0);
    createBooking.mutate(
      {
        amenity_id: form.amenityId,
        unit_id: form.unitId,
        member_id: form.memberId,
        booking_date: form.bookingDate,
        start_time: form.startTime,
        end_time: form.endTime,
        purpose: form.purpose.trim() || null,
        guests_count: Number.isFinite(guests) && guests >= 0 ? guests : 0,
      },
      {
        onSuccess(response) {
          addToast({ ...bookingCreatedToast(response.data.invoice_number), variant: 'success' });
          onOpenChange(false);
        },
        onError(error) {
          addToast({
            title: 'Failed to create booking',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Booking on Behalf of Resident</DialogTitle>
          <DialogDescription>
            Reserve an amenity for a resident. A paid amenity is invoiced to their flat when you reserve.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <AmenityField amenities={amenities} value={form.amenityId} onChange={(amenityId) => set({ amenityId })} />
          <UnitMemberFields form={form} set={set} />
          <BookingWhenFields form={form} set={set} />
          <BookingChargePreview amenityId={form.amenityId} startTime={form.startTime} endTime={form.endTime} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={createBooking.isPending}>
            {createBooking.isPending ? 'Reserving…' : 'Reserve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AmenityField({
  amenities,
  value,
  onChange,
}: {
  amenities: Amenity[];
  value: string;
  onChange: (id: string) => void;
}): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="nb-amenity">Amenity</Label>
      <Select id="nb-amenity" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select an amenity</option>
        {amenities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.pricing_type !== 'free' && Number(a.price_per_unit) > 0
              ? ` · ${formatCurrency(Number(a.price_per_unit))}`
              : ' · Free'}
          </option>
        ))}
      </Select>
    </div>
  );
}

interface FieldsProps {
  form: BookingForm;
  set: (patch: Partial<BookingForm>) => void;
}

function UnitMemberFields({ form, set }: FieldsProps): ReactNode {
  // GET /units pages at 100; the picker reads every page.
  const unitsQuery = useUnitChoices();
  const units = unitsQuery.data ?? [];
  const membersQuery = useUnitMembers(form.unitId);
  const members = membersQuery.data ?? [];
  const memberPrompt = !form.unitId
    ? 'Pick a unit first'
    : membersQuery.isLoading
      ? 'Loading…'
      : members.length === 0
        ? 'No members in this unit'
        : 'Select a member';

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor="nb-unit">Unit</Label>
        <Select
          id="nb-unit"
          value={form.unitId}
          onChange={(e) => set({ unitId: e.target.value, memberId: '' })}
        >
          <option value="">Select a unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.unit_number}
              {u.block ? ` · Block ${u.block}` : ''}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="nb-member">Member</Label>
        <Select
          id="nb-member"
          value={form.memberId}
          onChange={(e) => set({ memberId: e.target.value })}
          disabled={!form.unitId || membersQuery.isLoading}
        >
          <option value="">{memberPrompt}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name ?? 'Unnamed'} · {m.member_type}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function BookingWhenFields({ form, set }: FieldsProps): ReactNode {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="nb-date">Date</Label>
          <Input id="nb-date" type="date" value={form.bookingDate} onChange={(e) => set({ bookingDate: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nb-start">Start</Label>
          <Input id="nb-start" type="time" value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nb-end">End</Label>
          <Input id="nb-end" type="time" value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="nb-purpose">Purpose / notes</Label>
          <Input
            id="nb-purpose"
            value={form.purpose}
            onChange={(e) => set({ purpose: e.target.value })}
            placeholder="e.g. Birthday celebration"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nb-guests">Guests count</Label>
          <Input
            id="nb-guests"
            type="number"
            min={0}
            value={form.guestsCount}
            onChange={(e) => set({ guestsCount: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
