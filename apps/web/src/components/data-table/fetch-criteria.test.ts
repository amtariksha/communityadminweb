import { describe, expect, it } from 'vitest';
import { fetchCriteriaError, fetchParams } from './fetch-criteria';

describe('fetchCriteriaError (SB-09)', () => {
  it('lets an open range through unless the register needs one', () => {
    const open = { from: '', to: '', choice: 'all' };
    expect(fetchCriteriaError(open, { range: 'date' })).toBeNull();
    expect(fetchCriteriaError(open, { range: 'date', requireRange: true })).toBe('Choose a from and a to date.');
    expect(fetchCriteriaError(open, { range: 'number', requireRange: true })).toBe('Enter a from and a to number.');
  });

  it('refuses a range that runs backwards', () => {
    expect(fetchCriteriaError({ from: '2026-10-31', to: '2026-10-01', choice: '' }, { range: 'date' })).toBe(
      'The from date is after the to date.',
    );
    expect(fetchCriteriaError({ from: '120', to: '101', choice: '' }, { range: 'number' })).toBe(
      'The from number is after the to number.',
    );
    expect(fetchCriteriaError({ from: '101', to: '120', choice: '' }, { range: 'number' })).toBeNull();
  });

  it('refuses a number range that is not whole numbers', () => {
    expect(fetchCriteriaError({ from: '10.5', to: '', choice: '' }, { range: 'number' })).toBe(
      'Numbers must be whole numbers.',
    );
  });
});

describe('fetchParams', () => {
  it('sends only what was filled in, under the list route’s names', () => {
    expect(fetchParams({ from: '2026-10-01', to: '', choice: 'reversed' })).toEqual({
      from: '2026-10-01',
      status: 'reversed',
    });
    expect(
      fetchParams({ from: '101', to: '120', choice: 'all' }, { from: 'number_from', to: 'number_to', choice: 'view' }),
    ).toEqual({ number_from: '101', number_to: '120', view: 'all' });
    expect(fetchParams({ from: '', to: '', choice: 'all' }, { choice: '' })).toEqual({});
  });
});
