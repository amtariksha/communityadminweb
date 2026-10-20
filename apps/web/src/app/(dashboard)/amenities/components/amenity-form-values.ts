import type { Amenity } from '@/hooks';
import { plainText } from '../amenity-text';

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
  /** AMEN-21 — '' = none (the API credits Other Income). */
  incomeAccountId: string;
  /** AMEN-22 — Notes (`notes`) and the terms are HTML from the editor. */
  termsEnabled: boolean;
  termsText: string;
  allowMultiDay: boolean;
  /** AMEN-40 — '1'…'9', or '' = never cancel an unpaid booking. */
  autoCancelDays: string;
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
  income_account_id?: string | null;
  terms_enabled: boolean;
  terms_text: string | null;
  allow_multi_day: boolean;
  auto_cancel_days?: number | null;
}

export function amenityFormValues(amenity?: Amenity | null): AmenityFormValues {
  if (!amenity) {
    return {
      name: '', type: 'clubhouse', location: '', capacity: '', pricingType: 'free', price: '', deposit: '', notes: '', isActive: true,
      incomeAccountId: '', termsEnabled: false, termsText: '', allowMultiDay: false,
      // AMEN-S2 — a new amenity waits 2 days for payment.
      autoCancelDays: '2',
    };
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
    incomeAccountId: amenity.income_account_id ?? '',
    termsEnabled: amenity.terms_enabled === true,
    termsText: amenity.terms_text ?? '',
    allowMultiDay: amenity.allow_multi_day === true,
    autoCancelDays: amenity.auto_cancel_days ? String(amenity.auto_cancel_days) : '',
  };
}

/** Whether bookings of the amenity are charged (a rate or a deposit above 0). */
export function isPaid(values: Pick<AmenityFormValues, 'pricingType' | 'price' | 'deposit'>): boolean {
  return (values.pricingType !== 'free' && Number(values.price) > 0) || Number(values.deposit) > 0;
}

function amount(value: string): number | undefined | null {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * The payload, or the first thing to fix. `withActive` sends the Active tick
 * and holds the page's rules (it has the income account picker).
 */
export function amenityPayload(values: AmenityFormValues, withActive: boolean): { payload?: AmenityPayload; error?: string } {
  if (!values.name.trim()) return { error: 'Name is required' };
  // AMEN-S2 — a paid amenity names the account its invoices credit.
  if (withActive && isPaid(values) && !values.incomeAccountId) return { error: 'Pick the amenity income account' };
  if (values.termsEnabled && !plainText(values.termsText)) return { error: 'Write the terms and conditions, or switch them off' };
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
    rules: plainText(values.notes) ? values.notes.trim() : null,
    terms_enabled: values.termsEnabled,
    terms_text: plainText(values.termsText) ? values.termsText.trim() : null,
    // AMEN-22 — booking over several days is for an amenity charged by the date.
    allow_multi_day: values.allowMultiDay && values.pricingType === 'per_day',
  };
  // AMEN-40 — only the page has the field; '' = never cancelled automatically.
  if (withActive) payload.auto_cancel_days = values.autoCancelDays ? Number(values.autoCancelDays) : null;
  if (withActive) payload.is_active = values.isActive;
  if (values.incomeAccountId) payload.income_account_id = values.incomeAccountId;
  return { payload };
}
