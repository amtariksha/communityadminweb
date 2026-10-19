import { describe, expect, it } from 'vitest';
import { dayBefore, gstRatesFor, gstText, ruleText } from './rule-text';

describe('rule text (INC-S1)', () => {
  it('reads the non-zero parts of a line', () => {
    expect(ruleText({ rate_sqft1_month: '2.5000', rate_sqft2_month: '1.0000', unit_fee_month: '200.00' })).toBe(
      '₹2.50 / sq.ft 1 + ₹1.00 / sq.ft 2 + ₹200 per unit, per month',
    );
    expect(ruleText({ rate_sqft1_month: '0', rate_sqft2_month: '0', unit_fee_month: '1500.50' })).toBe(
      '₹1,500.50 per unit, per month',
    );
    expect(ruleText({ rate_sqft1_month: '2.3333', rate_sqft2_month: '0', unit_fee_month: '0' })).toBe(
      '₹2.3333 / sq.ft 1, per month',
    );
  });

  it('shows the GST rate or No', () => {
    expect(gstText({ gst_applicable: true, gst_rate: '18.00' })).toBe('18%');
    expect(gstText({ gst_applicable: false, gst_rate: '18.00' })).toBe('No');
  });

  it('offers 12% and 28% only before 22-09-2025', () => {
    expect(gstRatesFor('2026-11-01')).toEqual([5, 18, 40]);
    expect(gstRatesFor('2025-04-01')).toEqual([5, 12, 18, 28, 40]);
  });

  it('knows the day before', () => {
    expect(dayBefore('2026-12-01')).toBe('2026-11-30');
    expect(dayBefore('2027-03-01')).toBe('2027-02-28');
  });
});
