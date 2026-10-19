import { describe, expect, it } from 'vitest';
import { currentLease, type OnboardingSummary } from './use-tenant-lifecycle';

/** MOVE-01 — `approved` and `active` both mean the unit's current lease. */

const row = (id: string, status: string) => ({ id, status }) as OnboardingSummary;

describe('currentLease', () => {
  it('takes the newest approved or active row (rows come newest first)', () => {
    expect(currentLease([row('r3', 'pending'), row('r2', 'approved'), row('r1', 'terminated')])?.id).toBe('r2');
    expect(currentLease([row('r2', 'active'), row('r1', 'terminated')])?.id).toBe('r2');
  });

  it('is null when no row is current', () => {
    expect(currentLease([row('r1', 'terminated'), row('r0', 'rejected')])).toBeNull();
    expect(currentLease(undefined)).toBeNull();
  });
});
