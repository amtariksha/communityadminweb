import { describe, expect, it } from 'vitest';
import { calendarDateIST, currentFinancialYear, lastMonthRanges, yearContaining } from './date';

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

describe('currentFinancialYear (REP-02)', () => {
  it('runs April to March around the given day', () => {
    expect(currentFinancialYear('2026-10-14')).toEqual({ start_date: '2026-04-01', end_date: '2027-03-31' });
    expect(currentFinancialYear('2027-03-31')).toEqual({ start_date: '2026-04-01', end_date: '2027-03-31' });
    expect(currentFinancialYear('2027-04-01')).toEqual({ start_date: '2027-04-01', end_date: '2028-03-31' });
    expect(currentFinancialYear('2027-01-05')).toEqual({ start_date: '2026-04-01', end_date: '2027-03-31' });
  });
});

describe('calendarDateIST and yearContaining (GL-09)', () => {
  it('keeps a plain date and reads a timestamped DATE as its India day', () => {
    expect(calendarDateIST('2026-04-01')).toBe('2026-04-01');
    // DATE 2026-04-01 from a server running in IST.
    expect(calendarDateIST('2026-03-31T18:30:00.000Z')).toBe('2026-04-01');
    // The same DATE from a server running in UTC.
    expect(calendarDateIST('2026-04-01T00:00:00.000Z')).toBe('2026-04-01');
  });

  it('finds the year holding a date, ends included', () => {
    const years = [
      { id: 'a', start_date: '2025-03-31T18:30:00.000Z', end_date: '2026-03-30T18:30:00.000Z' },
      { id: 'b', start_date: '2026-04-01', end_date: '2027-03-31' },
    ];
    expect(yearContaining(years, '2026-03-31')?.id).toBe('a');
    expect(yearContaining(years, '2026-04-01')?.id).toBe('b');
    expect(yearContaining(years, '2027-04-01')).toBeUndefined();
  });
});
