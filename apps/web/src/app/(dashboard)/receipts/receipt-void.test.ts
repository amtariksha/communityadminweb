import { describe, expect, it } from 'vitest';
import { mayVoidReceipt, receiptModeOf } from './receipt-void';

describe('receipt void helpers', () => {
  it('reads the stored payment_mode before the request-side mode', () => {
    expect(receiptModeOf({ payment_mode: 'cheque', mode: 'cash' })).toBe('cheque');
    expect(receiptModeOf({ mode: 'upi' })).toBe('upi');
  });

  it('offers Void on a posted cheque, cash or transfer receipt', () => {
    expect(mayVoidReceipt({ payment_mode: 'cheque', mode: 'cheque', voided_at: null })).toBe(true);
    expect(mayVoidReceipt({ payment_mode: 'cash', mode: 'cash' })).toBe(true);
  });

  it('does not offer Void on a voided receipt or an online payment', () => {
    expect(mayVoidReceipt({ payment_mode: 'cash', mode: 'cash', voided_at: '2026-10-19T10:00:00Z' })).toBe(false);
    expect(mayVoidReceipt({ payment_mode: 'online', mode: 'online', voided_at: null })).toBe(false);
  });
});
