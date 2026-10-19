import { describe, expect, it } from 'vitest';
import type { Vendor } from '@communityos/shared';
import {
  chooseTdsSection,
  createVendorPayload,
  emptyVendorForm,
  tdsText,
  updateVendorPayload,
  vendorFormFromVendor,
} from './vendor-form';

const config = {
  enabled: true,
  default_threshold: 30000,
  default_rate: 1,
  sections: [{ code: '393(1)', label: 'Contractors', threshold: 30000, rate: 2 }],
};

const stored = {
  id: 'v1',
  tenant_id: 't1',
  name: 'Brightline Electricals',
  contact_person: 'Meera Iyer',
  phone: '+910000000041',
  email: null,
  address: '4 Lake Road',
  gstin: null,
  pan: 'ABCDE1234F',
  bank_details: { bank_name: 'Canara Bank', bank_branch: 'Jayanagar', account_number: '1234567890', ifsc: 'CNRB0000123' },
  tds_section: '393(1)',
  tds_rate: 2,
  is_active: false,
} as unknown as Vendor;

describe('vendor form (VEND-02, VEND-03)', () => {
  it('sends contact name, address, branch, TDS section and rate when adding', () => {
    const payload = createVendorPayload({
      ...emptyVendorForm(),
      name: ' Greenleaf Gardening ',
      contact_person: 'Ravi Kumar',
      address: '12 Market Road',
      bank_branch: 'Indiranagar',
      tds_section: '393(1)',
      tds_rate: '2',
    });
    expect(payload).toMatchObject({
      name: 'Greenleaf Gardening',
      contact_person: 'Ravi Kumar',
      address: '12 Market Road',
      bank_branch: 'Indiranagar',
      tds_section: '393(1)',
      tds_rate: 2,
      pan: null,
    });
  });

  it('fills a blank rate from the chosen section, and keeps a typed one', () => {
    expect(chooseTdsSection(emptyVendorForm(), '393(1)', config).tds_rate).toBe('2');
    expect(chooseTdsSection({ ...emptyVendorForm(), tds_rate: '1.5' }, '393(1)', config).tds_rate).toBe('1.5');
  });

  it('loads the stored vendor, bank details included', () => {
    expect(vendorFormFromVendor(stored)).toMatchObject({
      phone: '0000000041',
      bank_name: 'Canara Bank',
      bank_branch: 'Jayanagar',
      bank_account_number: '1234567890',
      tds_rate: '2',
      is_active: false,
    });
  });

  it('sends only what changed on edit: the Active tick alone, or the bank details together', () => {
    const initial = vendorFormFromVendor(stored);
    expect(updateVendorPayload(initial, { ...initial, is_active: true })).toEqual({ is_active: true });
    expect(updateVendorPayload(initial, { ...initial, contact_person: 'Asha Rao' })).toEqual({ contact_person: 'Asha Rao' });
    expect(updateVendorPayload(initial, { ...initial, bank_ifsc: 'HDFC0001234' })).toEqual({
      bank_name: 'Canara Bank', bank_branch: 'Jayanagar', bank_account_number: '1234567890', bank_ifsc: 'HDFC0001234',
    });
    expect(updateVendorPayload(initial, { ...initial, bank_branch: '' })).toMatchObject({ bank_branch: null, bank_name: 'Canara Bank' });
    expect(updateVendorPayload(initial, initial)).toEqual({});
  });

  it('writes TDS as rate and section', () => {
    expect(tdsText(stored)).toBe('2% (393(1))');
    expect(tdsText({ tds_section: null, tds_rate: null })).toBe('—');
  });
});
