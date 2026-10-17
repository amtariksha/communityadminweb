import { describe, expect, it } from 'vitest';
import { VENDOR_PAYMENT_MODE_OPTIONS } from './vendor-payment-modes';

describe('VENDOR_PAYMENT_MODE_OPTIONS', () => {
  it('offers Bank Transfer first (the default), then Cheque, Cash, UPI and DD', () => {
    expect(VENDOR_PAYMENT_MODE_OPTIONS.map((o) => [o.value, o.label])).toEqual([
      ['bank_transfer', 'Bank Transfer'],
      ['cheque', 'Cheque'],
      ['cash', 'Cash'],
      ['upi', 'UPI'],
      ['dd', 'DD'],
    ]);
  });

  it('has no separate NEFT or RTGS: both are bank transfers', () => {
    const values: string[] = VENDOR_PAYMENT_MODE_OPTIONS.map((o) => o.value);
    expect(values).not.toContain('neft');
    expect(values).not.toContain('rtgs');
  });
});
