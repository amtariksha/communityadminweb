import { describe, expect, it } from 'vitest';
import { formatServiceDate, serviceDateError, serviceDateRange } from './service-date';

describe('preferred service date (HELP-16)', () => {
  const today = '2026-10-19';

  it('runs from today to a year ahead', () => {
    expect(serviceDateRange(today)).toEqual({ min: '2026-10-19', max: '2027-10-19' });
  });

  it('accepts a blank date and a date in range', () => {
    expect(serviceDateError('', today)).toBeUndefined();
    expect(serviceDateError('2026-10-19', today)).toBeUndefined();
    expect(serviceDateError('2027-10-19', today)).toBeUndefined();
  });

  it('refuses yesterday and more than a year ahead', () => {
    expect(serviceDateError('2026-10-18', today)).toMatch(/from today/);
    expect(serviceDateError('2027-10-20', today)).toMatch(/from today/);
  });

  it('shows a stored day as dd/mm/yyyy', () => {
    expect(formatServiceDate('2026-11-02')).toBe('02/11/2026');
    expect(formatServiceDate(null)).toBe('—');
  });
});
