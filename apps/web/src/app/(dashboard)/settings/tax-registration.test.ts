import { describe, expect, it } from 'vitest';
import {
  readTaxRegistration,
  sameTaxRegistration,
  taxRegistrationErrors,
  toTaxRegistrationPayload,
} from './tax-registration';

describe('readTaxRegistration', () => {
  it('reads what is saved and treats null or missing as blank', () => {
    expect(readTaxRegistration({ gstin: '29ABCDE1234F1Z5', pan: null })).toEqual({
      gstin: '29ABCDE1234F1Z5',
      pan: '',
      society_registration_no: '',
    });
    expect(readTaxRegistration(undefined)).toEqual({ gstin: '', pan: '', society_registration_no: '' });
  });
});

describe('taxRegistrationErrors', () => {
  const blank = { gstin: '', pan: '', society_registration_no: '' };

  it('accepts blank fields and valid values', () => {
    expect(taxRegistrationErrors(blank)).toEqual({});
    expect(
      taxRegistrationErrors({ gstin: '29ABCDE1234F1Z5', pan: 'ABCDE1234F', society_registration_no: 'REG/42' }),
    ).toEqual({});
  });

  it('flags a malformed GSTIN or PAN', () => {
    expect(taxRegistrationErrors({ ...blank, gstin: '29ABCDE1234F1Z' }).gstin).toBeDefined();
    expect(taxRegistrationErrors({ ...blank, pan: 'ABCDE12345' }).pan).toBeDefined();
  });

  it('accepts lowercase typing (it is upper-cased on save) but not nonsense', () => {
    expect(taxRegistrationErrors({ ...blank, gstin: '29abcde1234f1z5' })).toEqual({});
    expect(taxRegistrationErrors({ ...blank, gstin: '!!' }).gstin).toBeDefined();
  });

  it('flags a registration number over 50 characters', () => {
    expect(taxRegistrationErrors({ ...blank, society_registration_no: 'R'.repeat(51) }).society_registration_no).toBeDefined();
  });
});

describe('toTaxRegistrationPayload', () => {
  it('upper-cases the GSTIN and PAN, trims, and sends null for a blank so it can be cleared', () => {
    expect(
      toTaxRegistrationPayload({ gstin: ' 29abcde1234f1z5 ', pan: '', society_registration_no: ' REG/42 ' }),
    ).toEqual({ gstin: '29ABCDE1234F1Z5', pan: null, society_registration_no: 'REG/42' });
  });
});

describe('sameTaxRegistration', () => {
  it('ignores case and surrounding spaces', () => {
    const a = { gstin: '29ABCDE1234F1Z5', pan: '', society_registration_no: '' };
    expect(sameTaxRegistration(a, { ...a, gstin: ' 29abcde1234f1z5' })).toBe(true);
    expect(sameTaxRegistration(a, { ...a, pan: 'ABCDE1234F' })).toBe(false);
  });
});
