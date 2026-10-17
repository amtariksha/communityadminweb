import { describe, expect, it } from 'vitest';
import { lastMonthRanges } from './date';

describe('lastMonthRanges', () => {
  it('lists whole calendar months, oldest first, ending with the month of today', () => {
    const ranges = lastMonthRanges(3, '2026-10-17');

    expect(ranges).toEqual([
      { month: '2026-08', label: 'Aug', start_date: '2026-08-01', end_date: '2026-08-31' },
      { month: '2026-09', label: 'Sep', start_date: '2026-09-01', end_date: '2026-09-30' },
      { month: '2026-10', label: 'Oct', start_date: '2026-10-01', end_date: '2026-10-31' },
    ]);
  });

  it('crosses a year boundary and knows February in a leap year', () => {
    const ranges = lastMonthRanges(4, '2028-02-29');

    expect(ranges.map((range) => range.month)).toEqual(['2027-11', '2027-12', '2028-01', '2028-02']);
    expect(ranges[3].end_date).toBe('2028-02-29');
  });

  it('returns nothing for a count below one', () => {
    expect(lastMonthRanges(0, '2026-10-17')).toEqual([]);
  });
});
