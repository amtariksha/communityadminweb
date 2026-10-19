import type { Vendor } from '@communityos/shared';
import { describe, expect, it } from 'vitest';
import { changedDefaultsPayload, defaultsFromVendor, defaultsPayload, emptyDefaults } from './vendor-defaults-form';

/** VEND-05 — the vendor form's accounting defaults and the bodies they send. */

const vendor = {
  id: 'v1',
  name: 'Lift Care Co',
  default_expense_account_id: 'head-1',
  default_cgst_rate: '9.00',
  default_sgst_rate: '9.00',
  default_igst_rate: null,
  vendor_type: 'company',
  payee_name: 'Lift Care Services',
  state_code: '29',
  legal_name: null,
} as unknown as Vendor;

describe('vendor accounting defaults', () => {
  it('reads CGST + SGST halves back as one 18% choice', () => {
    expect(defaultsFromVendor(vendor)).toEqual({
      head: 'head-1',
      gstKind: 'cgst_sgst',
      gstRate: '18',
      vendorType: 'company',
      payeeName: 'Lift Care Services',
      stateCode: '29',
      legalName: '',
    });
  });

  it('sends CGST + SGST 18% as 9 and 9, and IGST alone', () => {
    const base = { ...emptyDefaults(), head: 'head-1', gstRate: '18' };
    expect(defaultsPayload({ ...base, gstKind: 'cgst_sgst' }, '')).toMatchObject({ default_cgst_rate: 9, default_sgst_rate: 9, default_igst_rate: null });
    expect(defaultsPayload({ ...base, gstKind: 'igst' }, '')).toMatchObject({ default_cgst_rate: null, default_sgst_rate: null, default_igst_rate: 18 });
    expect(defaultsPayload({ ...base, gstKind: 'none' }, '')).toMatchObject({ default_cgst_rate: null, default_sgst_rate: null, default_igst_rate: null });
  });

  it('takes the state code from the GSTIN when none is typed', () => {
    expect(defaultsPayload(emptyDefaults(), '27ABCDE1234F1Z5').state_code).toBe('27');
    expect(defaultsPayload({ ...emptyDefaults(), stateCode: '29' }, '27ABCDE1234F1Z5').state_code).toBe('29');
  });

  it('an edit sends only what changed, with the three rates together', () => {
    const initial = defaultsFromVendor(vendor);
    expect(changedDefaultsPayload(initial, initial, '', '')).toEqual({});
    expect(changedDefaultsPayload(initial, { ...initial, gstKind: 'igst' }, '', '')).toEqual({
      default_igst_rate: 18,
      default_cgst_rate: null,
      default_sgst_rate: null,
    });
    expect(changedDefaultsPayload(initial, { ...initial, payeeName: 'LCS' }, '', '')).toEqual({ payee_name: 'LCS' });
  });
});
