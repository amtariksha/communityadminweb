import type { Amenity } from '@/hooks';

/** The fields of the amenity form (AMEN-S2, today's set) and what is sent. */

export interface AmenityFormValues {
  name: string;
  type: string;
  location: string;
  capacity: string;
  pricingType: string;
  price: string;
  deposit: string;
  notes: string;
  isActive: boolean;
}

export interface AmenityPayload {
  name: string;
  amenity_type: string;
  location: string | null;
  capacity: number | null;
  pricing_type: string;
  price_per_unit?: number;
  deposit_amount?: number;
  rules: string | null;
  is_active?: boolean;
}

export function amenityFormValues(amenity?: Amenity | null): AmenityFormValues {
  if (!amenity) {
    return { name: '', type: 'clubhouse', location: '', capacity: '', pricingType: 'free', price: '', deposit: '', notes: '', isActive: true };
  }
  return {
    name: amenity.name,
    type: amenity.amenity_type,
    location: amenity.location ?? '',
    capacity: amenity.capacity !== null ? String(amenity.capacity) : '',
    pricingType: amenity.pricing_type,
    price: amenity.price_per_unit ? String(amenity.price_per_unit) : '',
    deposit: amenity.deposit_amount ? String(amenity.deposit_amount) : '',
    notes: amenity.rules ?? '',
    isActive: amenity.is_active,
  };
}

function amount(value: string): number | undefined | null {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** The payload, or the first thing to fix. `withActive` sends the Active tick (the form page has it). */
export function amenityPayload(values: AmenityFormValues, withActive: boolean): { payload?: AmenityPayload; error?: string } {
  if (!values.name.trim()) return { error: 'Name is required' };
  const capacity = values.capacity.trim() === '' ? null : Number(values.capacity);
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) return { error: 'Capacity must be a whole number above 0' };
  const price = amount(values.price);
  const deposit = amount(values.deposit);
  if (price === null || deposit === null) return { error: 'Price and deposit must be amounts of 0 or more' };
  const payload: AmenityPayload = {
    name: values.name.trim(),
    amenity_type: values.type,
    location: values.location.trim() || null,
    capacity,
    pricing_type: values.pricingType,
    price_per_unit: price,
    deposit_amount: deposit,
    rules: values.notes.trim() || null,
  };
  if (withActive) payload.is_active = values.isActive;
  return { payload };
}
