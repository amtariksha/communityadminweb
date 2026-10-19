import { describe, expect, it, vi } from 'vitest';
import { recordDraftFrom, recordPayload, validTillPreview } from './staff-record';

vi.mock('@/lib/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/date')>()),
  todayIST: () => '2026-01-01',
}));

/** STAFF-20 — an expiring badge with no issue date is issued today, as the API stores it. */
describe('staff record', () => {
  it('previews and sends today as the issue date of an expiring badge', () => {
    const draft = { ...recordDraftFrom(null), validity: '6' };

    expect(validTillPreview(draft)).toBe('2026-06-30');
    expect(recordPayload(draft, false)).toMatchObject({ badge_issued_on: '2026-01-01', badge_validity_months: 6 });
  });

  it('sends no issue date for a badge without expiry', () => {
    expect(recordPayload(recordDraftFrom(null), false)).toMatchObject({ badge_issued_on: null, badge_validity_months: 0 });
  });
});
