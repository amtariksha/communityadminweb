'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useUnitMembers } from '@/hooks';
import type { Amenity } from '@/hooks';
import { useUnitChoices } from '../../helpdesk/new/use-unit-choices';

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
}

export function emptyBookingForm(date: string): BookingFormValues {
  return {
    amenityId: '', unitId: '', memberId: '', bookingDate: date,
    startTime: '09:00', endTime: '10:00', purpose: '', guestsCount: '0',
  };
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

export function BookingWhenFields({ form, set }: FieldsProps): ReactNode {
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
