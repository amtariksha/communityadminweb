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
      terms_enabled: false,
      terms_text: null,
      allow_multi_day: false,
    });
    expect(amenityPayload({ ...values, isActive: false, incomeAccountId: 'acc-1' }, true).payload?.is_active).toBe(false);
  });

  it('refuses a blank name, a capacity of 0 and a negative price', () => {
    expect(amenityPayload({ ...values, name: ' ' }, false).error).toBe('Name is required');
    expect(amenityPayload({ ...values, capacity: '0' }, false).error).toMatch(/Capacity/);
    expect(amenityPayload({ ...values, price: '-1' }, false).error).toMatch(/amounts/);
  });

  it('makes the page name the income account of a paid amenity, and sends it (AMEN-21)', () => {
    expect(amenityPayload(values, true).error).toBe('Pick the amenity income account');
    expect(amenityPayload({ ...values, pricingType: 'free', price: '' }, true).error).toBeUndefined();
    expect(amenityPayload({ ...values, incomeAccountId: 'acc-1' }, true).payload?.income_account_id).toBe('acc-1');
    // The standard dialog has no picker: the API keeps crediting Other Income.
    expect(amenityPayload(values, false).payload).not.toHaveProperty('income_account_id');
  });

  it('needs terms text when the terms are on, and multi-day only for an amenity charged by the date (AMEN-22)', () => {
    const free = { ...values, pricingType: 'free', price: '' };
    expect(amenityPayload({ ...free, termsEnabled: true, termsText: '<p> </p>' }, false).error).toMatch(/terms/);
    expect(amenityPayload({ ...free, termsEnabled: true, termsText: '<p>Clean up after</p>' }, false).payload).toMatchObject({
      terms_enabled: true,
      terms_text: '<p>Clean up after</p>',
    });
    expect(amenityPayload({ ...free, allowMultiDay: true }, false).payload?.allow_multi_day).toBe(false);
    expect(amenityPayload({ ...free, pricingType: 'per_day', allowMultiDay: true }, false).payload?.allow_multi_day).toBe(true);
    expect(amenityPayload({ ...free, notes: '<p></p>' }, false).payload?.rules).toBeNull();
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
