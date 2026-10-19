import { describe, expect, it } from 'vitest';
import { defaultGstType, lineAmounts, ratesFor, rupees, sumAmounts } from './gst-lines';

describe('purchase request line maths (EXP-06 rule)', () => {
  it('matches the server on the EXP-06 example: 2 × 500 CGST+SGST 18% and 1 × 1,000 IGST 18%', () => {
    const first = lineAmounts(2, 500, 'cgst_sgst', 18);
    const second = lineAmounts(1, 1000, 'igst', 18);
    expect(first).toEqual({ taxable: 100000, cgst: 9000, sgst: 9000, igst: 0, total: 118000 });
    expect(second).toEqual({ taxable: 100000, cgst: 0, sgst: 0, igst: 18000, total: 118000 });
    expect(sumAmounts([first, second]).total).toBe(236000);
    expect(rupees(236000)).toBe('₹2,360.00');
  });

  it('rounds half up to the paisa', () => {
    expect(lineAmounts(1.005, 10.05, 'cgst_sgst', 5)).toMatchObject({ taxable: 1010, cgst: 25, sgst: 25, total: 1060 });
    expect(lineAmounts(0.335, 15, 'none', 0).taxable).toBe(503);
  });

  it('counts a blank quantity or rate as nothing', () => {
    expect(lineAmounts(Number.NaN, 100, 'igst', 18).total).toBe(0);
  });

  it('defaults to IGST for a vendor in another state', () => {
    expect(defaultGstType('29', { state_code: '27' })).toBe('igst');
    expect(defaultGstType('29', { gstin: '29ABCDE1234F1Z5' })).toBe('cgst_sgst');
    expect(defaultGstType(null, { state_code: '27' })).toBe('cgst_sgst');
  });

  it('offers 12% and 28% only on documents dated before the reform', () => {
    const gst = { rate_options: [0, 5, 18, 40], pre_reform_rates: [12, 28], reform_date: '2025-09-22' };
    expect(ratesFor(gst, '2026-10-01')).toEqual([0, 5, 18, 40]);
    expect(ratesFor(gst, '2025-09-01')).toEqual([0, 5, 12, 18, 28, 40]);
  });
});
