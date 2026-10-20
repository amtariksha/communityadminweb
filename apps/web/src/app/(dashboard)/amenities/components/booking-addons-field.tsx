'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import type { Amenity } from '@/hooks';
import { useAmenityAddons } from '@/hooks/use-amenity-setup';
import { formatCurrency } from '@/lib/utils';

/**
 * AMEN-42 — the add-ons a paid amenity sells with a booking: how many of
 * each (up to its maximum). Hidden for a free amenity, one with no add-ons,
 * and on an older API.
 */

/** Add-on id → quantity typed ('' or '0' = none). */
export type AddonQuantities = Record<string, string>;

/** What the booking and the quote send: the add-ons with a quantity above 0. */
export function chosenAddons(quantities: AddonQuantities): Array<{ addon_id: string; quantity: number }> {
  return Object.entries(quantities)
    .map(([addonId, value]) => ({ addon_id: addonId, quantity: Number(value) }))
    .filter((addon) => Number.isInteger(addon.quantity) && addon.quantity > 0);
}

interface BookingAddonsFieldProps {
  amenity?: Amenity;
  value: AddonQuantities;
  onChange: (quantities: AddonQuantities) => void;
}

export function BookingAddonsField({ amenity, value, onChange }: BookingAddonsFieldProps): ReactNode {
  const paid = amenity !== undefined && amenity.pricing_type !== 'free';
  const addonsQuery = useAmenityAddons(paid ? amenity.id : '');
  const addons = paid ? addonsQuery.data ?? [] : [];
  if (addons.length === 0) return null;
  return (
    <fieldset className="space-y-2 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Add-ons</legend>
      {addons.map((addon) => (
        <div key={addon.id} className="flex items-center justify-between gap-3 text-sm">
          <label htmlFor={`addon-${addon.id}`} className="flex-1">
            {addon.name} <span className="text-muted-foreground">· {formatCurrency(Number(addon.unit_cost))} each, up to {addon.max_units}</span>
          </label>
          <Input
            id={`addon-${addon.id}`}
            type="number"
            min={0}
            max={addon.max_units}
            className="w-20"
            value={value[addon.id] ?? ''}
            onChange={(e) => onChange({ ...value, [addon.id]: e.target.value })}
          />
        </div>
      ))}
    </fieldset>
  );
}
