import { describe, expect, it } from 'vitest';
import { formatDate } from './asset-ui';

describe('asset formatDate', () => {
  it('shows a plain API date as that calendar day', () => {
    // A DATE column arrives as 'YYYY-MM-DD'; read through new Date() it is UTC
    // midnight, which a browser west of Greenwich shows as the day before.
    expect(formatDate('2026-04-01')).toBe('01 Apr 2026');
    expect(formatDate('2027-03-31')).toBe('31 Mar 2027');
  });

  it('shows a dash when there is no date', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate('')).toBe('-');
  });
});
