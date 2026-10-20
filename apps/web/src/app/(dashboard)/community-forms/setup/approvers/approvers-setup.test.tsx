import { describe, expect, it } from 'vitest';
import { inPool } from './approvers-content';

/** FORM-S1 — the people select filters the grid: committee members, other office holders, or both. */
describe('approver pool', () => {
  const committee = { roles: ['committee_member'] };
  const accountant = { roles: ['accountant'] };

  it('splits the office holders into the committee and office staff', () => {
    expect(inPool('committee', committee)).toBe(true);
    expect(inPool('committee', accountant)).toBe(false);
    expect(inPool('office', accountant)).toBe(true);
    expect(inPool('office', committee)).toBe(false);
    expect(inPool('all', accountant) && inPool('all', committee)).toBe(true);
  });
});
