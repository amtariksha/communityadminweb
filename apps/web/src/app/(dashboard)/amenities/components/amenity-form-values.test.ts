import { describe, expect, it } from 'vitest';
import { amenityFormValues, amenityPayload } from './amenity-form-values';

/** AMEN-10 — the amenity form (one component for its dialog and its page) checks what it sends. */
describe('amenityPayload', () => {
  const values = { ...amenityFormValues(), name: ' Party Hall ', pricingType: 'hourly', price: '500', capacity: '50' };

  it('sends the trimmed fields, and the Active tick only from the page', () => {
    expect(amenityPayload(values, false).payload).toEqual({
      name: 'Party Hall',
      amenity_type: 'clubhouse',
      location: null,
      capacity: 50,
      pricing_type: 'hourly',
      price_per_unit: 500,
      deposit_amount: undefined,
      rules: null,
    });
    expect(amenityPayload({ ...values, isActive: false }, true).payload?.is_active).toBe(false);
  });

  it('refuses a blank name, a capacity of 0 and a negative price', () => {
    expect(amenityPayload({ ...values, name: ' ' }, false).error).toBe('Name is required');
    expect(amenityPayload({ ...values, capacity: '0' }, false).error).toMatch(/Capacity/);
    expect(amenityPayload({ ...values, price: '-1' }, false).error).toMatch(/amounts/);
  });

  it("starts an edit from the amenity's values", () => {
    const form = amenityFormValues({
      id: 'am-1', tenant_id: 't', name: 'Hall', amenity_type: 'party_hall', description: null, location: 'Block A',
      capacity: null, pricing_type: 'per_day', price_per_unit: 1000, deposit_amount: 0, rules: 'Notes', is_active: false,
      created_at: '', updated_at: '',
    });

    expect(form).toMatchObject({ name: 'Hall', type: 'party_hall', capacity: '', price: '1000', deposit: '', notes: 'Notes', isActive: false });
  });
});
