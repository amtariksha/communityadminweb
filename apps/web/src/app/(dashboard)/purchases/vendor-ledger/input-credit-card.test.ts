import { describe, expect, it } from 'vitest';
import { inputCreditClaimed, readInputCredit } from './input-credit-card';

/** Purchase GST card (EXP-11): the same rule the invoice posting reads. */
describe('Purchase GST setting', () => {
  it('follows the GSTIN while the society has not chosen', () => {
    expect(readInputCredit({})).toBeNull();
    expect(inputCreditClaimed({ gstin: '29ABCDE1234F1Z5' })).toBe(true);
    expect(inputCreditClaimed({})).toBe(false);
  });

  it('a saved choice wins over the GSTIN', () => {
    expect(inputCreditClaimed({ gstin: '29ABCDE1234F1Z5', gst_input_credit_claimable: false })).toBe(false);
    expect(inputCreditClaimed({ gst_input_credit_claimable: true })).toBe(true);
  });
});

describe('Vendor credit days (EXP-S8)', () => {
  it('reads the saved days, else 30, the rule the invoice posting reads', async () => {
    const { readCreditDays } = await import('../vendor-invoice/invoice-model');
    expect(readCreditDays({ vendor_credit_days: 45 })).toBe(45);
    expect(readCreditDays({ vendor_credit_days: 0 })).toBe(0);
    expect(readCreditDays({})).toBe(30);
    expect(readCreditDays({ vendor_credit_days: 400 })).toBe(30);
  });

  it('accepts whole days from 0 to 365 only', async () => {
    const { creditDaysIssue } = await import('./credit-days-card');
    expect(creditDaysIssue('45')).toBeNull();
    expect(creditDaysIssue('0')).toBeNull();
    expect(creditDaysIssue('366')).not.toBeNull();
    expect(creditDaysIssue('7.5')).not.toBeNull();
    expect(creditDaysIssue('')).not.toBeNull();
  });
});
