'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useAmenitySlots, useUnitMembers } from '@/hooks';
import type { Amenity, AmenitySlot } from '@/hooks';
import { useUnitChoices } from '../../helpdesk/new/use-unit-choices';
import { safeAmenityHtml } from '../amenity-text';

/** The fields of the booking form (AMEN-S8), shared by its dialog and its page. */

export interface BookingFormValues {
  amenityId: string;
  unitId: string;
  memberId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  guestsCount: string;
  /** AMEN-22 — '' = one day; the booker accepted the amenity's terms. */
  endDate: string;
  acceptTerms: boolean;
  /** AMEN-20 — the slot picked ('' = times typed in). */
  slotId: string;
}

export function emptyBookingForm(date: string): BookingFormValues {
  return {
    amenityId: '', unitId: '', memberId: '', bookingDate: date,
    startTime: '09:00', endTime: '10:00', purpose: '', guestsCount: '0',
    endDate: '', acceptTerms: false, slotId: '',
  };
}

/** "Morning 06:00–09:00 · ₹500" */
export function slotLabel(slot: AmenitySlot): string {
  const times = `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`;
  const cost = slot.cost != null ? ` · ${formatCurrency(Number(slot.cost))}` : '';
  return `${slot.name ? `${slot.name} ` : ''}${times}${cost}${slot.is_available ? '' : ' (taken)'}`;
}

/**
 * AMEN-20 — an amenity charged by the slot is booked in one of the day's
 * slots (each at its own cost); picking one sets the times. Hidden when the
 * amenity has no slots that day (the times are typed in, as before).
 */
export function BookingSlotField({ form, set, amenity }: FieldsProps & { amenity?: Amenity }): ReactNode {
  const slotsQuery = useAmenitySlots(amenity?.pricing_type === 'per_slot' ? amenity.id : '', form.bookingDate);
  const slots = (slotsQuery.data ?? []).filter((slot) => Boolean(slot.id));
  if (slots.length === 0) return null;
  const pick = (slotId: string): void => {
    const slot = slots.find((row) => row.id === slotId);
    set(slot ? { slotId, startTime: slot.start_time.slice(0, 5), endTime: slot.end_time.slice(0, 5) } : { slotId: '' });
  };
  return (
    <div className="space-y-2">
      <Label htmlFor="nb-slot">Slot</Label>
      <Select id="nb-slot" value={form.slotId} onChange={(e) => pick(e.target.value)}>
        <option value="">Pick a slot, or type the times</option>
        {slots.map((slot) => (
          <option key={slot.id} value={slot.id} disabled={!slot.is_available}>
            {slotLabel(slot)}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function AmenityField({
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

export interface FieldsProps {
  form: BookingFormValues;
  set: (patch: Partial<BookingFormValues>) => void;
}

/** AMEN-22 — the amenity's terms, shown sanitised, which the booker must accept. */
export function BookingTermsField({ form, set, amenity }: FieldsProps & { amenity?: Amenity }): ReactNode {
  if (!amenity?.terms_enabled) return null;
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">Terms and Conditions</p>
      <div
        className="prose prose-sm max-h-40 max-w-none overflow-y-auto text-sm [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: safeAmenityHtml(amenity.terms_text) }}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.acceptTerms} onChange={(e) => set({ acceptTerms: e.target.checked })} />
        The resident accepts the terms and conditions
      </label>
    </div>
  );
}

export function UnitMemberFields({ form, set }: FieldsProps): ReactNode {
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

export function BookingWhenFields({ form, set, amenity }: FieldsProps & { amenity?: Amenity }): ReactNode {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="nb-date">Date</Label>
          <Input id="nb-date" type="date" value={form.bookingDate} onChange={(e) => set({ bookingDate: e.target.value, slotId: '' })} />
        </div>
        {/* AMEN-22 — an amenity charged by the date may be booked for several days. */}
        {amenity?.allow_multi_day && (
          <div className="space-y-2">
            <Label htmlFor="nb-end-date">End date</Label>
            <Input id="nb-end-date" type="date" min={form.bookingDate} value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="nb-start">Start</Label>
          <Input id="nb-start" type="time" value={form.startTime} onChange={(e) => set({ startTime: e.target.value, slotId: '' })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nb-end">End</Label>
          <Input id="nb-end" type="time" value={form.endTime} onChange={(e) => set({ endTime: e.target.value, slotId: '' })} />
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
