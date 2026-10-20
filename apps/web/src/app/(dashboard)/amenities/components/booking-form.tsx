'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useCreateBooking } from '@/hooks';
import type { Amenity } from '@/hooks';
import { BookingChargePreview } from './booking-charge-preview';
import {
  AmenityField,
  BookingSlotField,
  BookingTermsField,
  BookingWhenFields,
  emptyBookingForm,
  UnitMemberFields,
  type BookingFormValues,
} from './booking-fields';

/**
 * The admin books an amenity on behalf of a resident: unit first, then a
 * member of that unit. The API charges the booking by the amenity's
 * pricing and, for a paid amenity, raises and posts its invoice in the
 * same request (AMEN-03: there is no separate "generate invoice" step).
 * Standard shows it as the New Booking dialog; classic as the Reserve
 * Amenity page (AMEN-10, SB-07).
 */

const TIME = /^\d{2}:\d{2}$/;

/** A last day after the first (AMEN-22); '' or the same day = a one-day booking. */
const severalDays = (form: BookingFormValues): boolean => form.endDate !== '' && form.endDate > form.bookingDate;

export function validateBookingForm(form: BookingFormValues, amenity?: Amenity): string | null {
  if (!form.amenityId) return 'Please pick an amenity.';
  if (!form.unitId) return 'Please pick a unit.';
  if (!form.memberId) return 'Please pick a member.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.bookingDate)) return 'Date must be YYYY-MM-DD.';
  if (!TIME.test(form.startTime) || !TIME.test(form.endTime)) return 'Times must be HH:MM.';
  if (form.endDate && form.endDate < form.bookingDate) return 'End date must be on or after the date.';
  if (!severalDays(form) && form.startTime >= form.endTime) return 'End time must be after start time.';
  if (amenity?.terms_enabled && !form.acceptTerms) return 'The resident has to accept the terms and conditions.';
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

interface BookingFormProps {
  mode: FormMode;
  /** Dialog only. */
  open?: boolean;
  onClose: () => void;
  onSaved: () => void;
  amenities: Amenity[];
  defaultDate: string;
}

export function bookingInput(form: BookingFormValues, amenity?: Amenity) {
  const guests = Number(form.guestsCount || 0);
  return {
    amenity_id: form.amenityId,
    unit_id: form.unitId,
    member_id: form.memberId,
    booking_date: form.bookingDate,
    start_time: form.startTime,
    end_time: form.endTime,
    purpose: form.purpose.trim() || null,
    guests_count: Number.isFinite(guests) && guests >= 0 ? guests : 0,
    ...(severalDays(form) ? { end_date: form.endDate } : {}),
    ...(amenity?.terms_enabled ? { accept_terms: form.acceptTerms } : {}),
    ...(form.slotId ? { slot_id: form.slotId } : {}),
  };
}

export function BookingForm({ mode, open, onClose, onSaved, amenities, defaultDate }: BookingFormProps): ReactNode {
  const { addToast } = useToast();
  const createBooking = useCreateBooking();
  const [form, setForm] = useState<BookingFormValues>(() => emptyBookingForm(defaultDate));
  const set = (patch: Partial<BookingFormValues>) => setForm((prev) => ({ ...prev, ...patch }));

  // Reset whenever the dialog opens, so a previous booking's values never linger.
  useEffect(() => {
    if (open) setForm(emptyBookingForm(defaultDate));
  }, [open, defaultDate]);

  const amenity = amenities.find((row) => row.id === form.amenityId);

  function handleSubmit(): void {
    const err = validateBookingForm(form, amenity);
    if (err) {
      addToast({ title: err, variant: 'destructive' });
      return;
    }
    createBooking.mutate(bookingInput(form, amenity), {
      onSuccess(response) {
        addToast({ ...bookingCreatedToast(response.data.invoice_number), variant: 'success' });
        onSaved();
      },
      onError(error) {
        addToast({ title: 'Failed to create booking', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title={mode === 'page' ? 'Reserve Amenity' : 'New Booking on Behalf of Resident'}
      description="Reserve an amenity for a resident. A paid amenity is invoiced to their flat when you reserve."
      onClose={onClose}
      onSave={handleSubmit}
      saving={createBooking.isPending}
      saveLabel="Reserve"
      savingLabel="Reserving…"
      dialogClassName="max-w-lg"
    >
      <AmenityField amenities={amenities} value={form.amenityId} onChange={(amenityId) => set({ amenityId, endDate: '', acceptTerms: false, slotId: '' })} />
      <UnitMemberFields form={form} set={set} />
      <BookingWhenFields form={form} set={set} amenity={amenity} />
      <BookingSlotField form={form} set={set} amenity={amenity} />
      <BookingTermsField form={form} set={set} amenity={amenity} />
      <BookingChargePreview
        amenityId={form.amenityId}
        request={{
          startTime: form.startTime,
          endTime: form.endTime,
          date: form.bookingDate,
          endDate: severalDays(form) ? form.endDate : undefined,
          slotId: form.slotId || undefined,
        }}
      />
    </FormFrame>
  );
}

interface NewBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amenities: Amenity[];
  defaultDate: string;
}

/** The standard layout's New Booking dialog. */
export function NewBookingDialog({ open, onOpenChange, amenities, defaultDate }: NewBookingDialogProps): ReactNode {
  return (
    <BookingForm
      mode="dialog"
      open={open}
      onClose={() => onOpenChange(false)}
      onSaved={() => onOpenChange(false)}
      amenities={amenities}
      defaultDate={defaultDate}
    />
  );
}
