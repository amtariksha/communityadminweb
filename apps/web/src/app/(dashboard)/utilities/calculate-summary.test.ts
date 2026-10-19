import { describe, expect, it } from 'vitest';
import { calculateBillsSummary } from './calculate-summary';

describe('Calculate Bills toast (UTIL-02)', () => {
  it('counts the bills', () => {
    expect(calculateBillsSummary({ count: 3, skipped: [] })).toEqual({ title: '3 bills calculated' });
    expect(calculateBillsSummary({ count: 1 })).toEqual({ title: '1 bill calculated' });
  });

  it('lists each skipped meter with its reason', () => {
    expect(
      calculateBillsSummary({
        count: 0,
        skipped: [
          { meter_number: 'W-101', reason: 'no opening reading' },
          { meter_number: 'W-102', reason: 'period overlaps an existing bill' },
        ],
      }).description,
    ).toBe('2 skipped: W-101 (no opening reading), W-102 (period overlaps an existing bill).');
  });

  it('names five and counts the rest', () => {
    const skipped = Array.from({ length: 7 }, (_, i) => ({ meter_number: `W-${i + 1}`, reason: 'no reading in period' }));
    expect(calculateBillsSummary({ count: 2, skipped }).description).toMatch(/^7 skipped: W-1 .*W-5 \(no reading in period\), and 2 more\.$/);
  });
});
