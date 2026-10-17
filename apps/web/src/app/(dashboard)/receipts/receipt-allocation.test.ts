import { describe, expect, it } from 'vitest';
import {
  describeReceiptAllocation,
  summarizeAdvances,
  summarizeReceiptAllocation,
} from './receipt-allocation';

describe('summarizeReceiptAllocation', () => {
  it('splits a receipt into what settled invoices and what is held', () => {
    const summary = summarizeReceiptAllocation(2500, [
      { invoice_id: 'a', amount: '1000.00' },
      { invoice_id: 'b', amount: '1000.00' },
    ]);

    expect(summary).toEqual({ allocated: 2000, invoiceCount: 2, advance: 500 });
  });

  it('counts an invoice once even if it has two allocation rows', () => {
    const summary = summarizeReceiptAllocation(300, [
      { invoice_id: 'a', amount: 100 },
      { invoice_id: 'a', amount: 200 },
    ]);

    expect(summary).toEqual({ allocated: 300, invoiceCount: 1, advance: 0 });
  });

  it('treats a missing allocation list as all advance', () => {
    expect(summarizeReceiptAllocation(1500, undefined)).toEqual({
      allocated: 0,
      invoiceCount: 0,
      advance: 1500,
    });
  });

  it('works in paise', () => {
    expect(summarizeReceiptAllocation(0.3, [{ invoice_id: 'a', amount: 0.1 }]).advance).toBe(0.2);
  });
});

describe('describeReceiptAllocation', () => {
  it('reads as the toast the ticket asks for', () => {
    expect(describeReceiptAllocation({ allocated: 1500, invoiceCount: 2, advance: 0 })).toBe(
      'Allocated ₹1,500 to 2 invoices; ₹0 held as advance',
    );
  });

  it('uses the singular for one invoice', () => {
    expect(describeReceiptAllocation({ allocated: 1000, invoiceCount: 1, advance: 500 })).toBe(
      'Allocated ₹1,000 to 1 invoice; ₹500 held as advance',
    );
  });
});

describe('summarizeAdvances', () => {
  it('counts distinct units and totals what is unapplied', () => {
    expect(
      summarizeAdvances([
        { unit_id: 'u1', remaining: '300.00' },
        { unit_id: 'u1', remaining: '200.00' },
        { unit_id: 'u2', remaining: '1000.50' },
        { unit_id: 'u3', remaining: '0.00' },
      ]),
    ).toEqual({ unitCount: 2, total: 1500.5 });
  });
});
