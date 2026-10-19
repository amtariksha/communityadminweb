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
