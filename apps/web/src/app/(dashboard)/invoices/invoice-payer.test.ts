import { describe, expect, it } from 'vitest';
import { describeInvoicePayer, INVOICE_PARTY_OPTIONS } from './invoice-payer';

describe('describeInvoicePayer', () => {
  it('names the unit and its owner for a unit invoice', () => {
    expect(
      describeInvoicePayer({
        unit_id: 'u1',
        unit_number: 'A-101',
        block: 'A',
        owner_name: 'Owner A-101',
        tenant_name: 'Tenant A-101',
      }),
    ).toEqual({
      kind: 'unit',
      primary: 'A-101 (Block A)',
      secondary: 'Owner A-101',
      tertiary: '(Tenant: Tenant A-101)',
    });
  });

  it('names the payer for an invoice raised to a non-member', () => {
    expect(
      describeInvoicePayer({ unit_id: null, customer_id: 'c1', customer_name: 'Sunrise Caterers' }),
    ).toEqual({ kind: 'non_member', primary: 'Sunrise Caterers', secondary: 'Non-member', tertiary: null });
  });

  it('falls back to a dash when a unit invoice has no owner', () => {
    expect(describeInvoicePayer({ unit_id: 'u1', unit_number: 'B-7' }).secondary).toBe('—');
  });
});

describe('INVOICE_PARTY_OPTIONS', () => {
  it('offers All, Units and Non-members, in that order', () => {
    expect(INVOICE_PARTY_OPTIONS.map((o) => [o.value, o.label])).toEqual([
      ['', 'All payers'],
      ['unit', 'Units'],
      ['customer', 'Non-members'],
    ]);
  });
});
