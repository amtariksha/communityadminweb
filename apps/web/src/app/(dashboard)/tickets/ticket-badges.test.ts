import { describe, expect, it } from 'vitest';
import { requestAgeDays } from './ticket-badges';

describe('requestAgeDays', () => {
  const now = new Date('2026-10-18T12:00:00Z');

  it('uses the server’s count when it has one', () => {
    expect(requestAgeDays({ status: 'open', created_at: '2026-10-01T00:00:00Z', age_days: 7 }, now)).toBe(7);
  });

  it('counts whole days since opening for an open request', () => {
    const created = new Date(now.getTime() - (3 * 24 + 5) * 3600_000).toISOString();

    expect(requestAgeDays({ status: 'in_progress', created_at: created }, now)).toBe(3);
  });

  it('counts from opening to closing for a completed one', () => {
    expect(
      requestAgeDays({ status: 'closed', created_at: '2026-10-01T10:00:00Z', closed_at: '2026-10-04T11:00:00Z' }, now),
    ).toBe(3);
  });
});
