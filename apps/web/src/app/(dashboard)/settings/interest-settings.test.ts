import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INTEREST,
  interestErrors,
  readInterestSettings,
  sameInterest,
  toInterestPayload,
} from './interest-settings';

describe('readInterestSettings', () => {
  it('uses 18% a year, 10 days, counted from the due date when nothing is saved', () => {
    expect(readInterestSettings(undefined)).toEqual(DEFAULT_INTEREST);
    expect(DEFAULT_INTEREST).toEqual({ rate_pa: '18', due_days: '10', basis: 'due_date', start_date: '' });
  });

  it('reads what is saved', () => {
    expect(
      readInterestSettings({ rate_pa: 15.5, due_days: 20, basis: 'invoice_date', start_date: '2026-04-01' }),
    ).toEqual({ rate_pa: '15.5', due_days: '20', basis: 'invoice_date', start_date: '2026-04-01' });
  });

  it('falls back to the defaults for malformed values', () => {
    expect(readInterestSettings({ rate_pa: 'x', due_days: null, basis: 'weekly', start_date: 5 })).toEqual(
      DEFAULT_INTEREST,
    );
  });
});

describe('interestErrors', () => {
  const ok = { rate_pa: '18', due_days: '10', basis: 'due_date' as const, start_date: '' };

  it('accepts a valid form', () => {
    expect(interestErrors(ok)).toEqual({});
  });

  it('rejects a rate outside 0-36 or with more than two decimals', () => {
    expect(interestErrors({ ...ok, rate_pa: '40' }).rate_pa).toBeDefined();
    expect(interestErrors({ ...ok, rate_pa: '-1' }).rate_pa).toBeDefined();
    expect(interestErrors({ ...ok, rate_pa: '12.345' }).rate_pa).toBeDefined();
    expect(interestErrors({ ...ok, rate_pa: '' }).rate_pa).toBeDefined();
  });

  it('rejects due days outside 0-365 or not whole', () => {
    expect(interestErrors({ ...ok, due_days: '366' }).due_days).toBeDefined();
    expect(interestErrors({ ...ok, due_days: '2.5' }).due_days).toBeDefined();
    expect(interestErrors({ ...ok, due_days: '0' }).due_days).toBeUndefined();
  });
});

describe('toInterestPayload', () => {
  it('sends the whole object and keeps keys this form does not edit', () => {
    const payload = toInterestPayload(
      { rate_pa: '15', due_days: '20', basis: 'invoice_date', start_date: '' },
      { rate_pa: 18, due_days: 10, basis: 'due_date', hsn_sac: '997212', auto_post: true },
    );
    expect(payload).toEqual({
      rate_pa: 15,
      due_days: 20,
      basis: 'invoice_date',
      start_date: null,
      hsn_sac: '997212',
      auto_post: true,
    });
  });
});

describe('sameInterest', () => {
  it('compares the four fields', () => {
    expect(sameInterest(DEFAULT_INTEREST, { ...DEFAULT_INTEREST })).toBe(true);
    expect(sameInterest(DEFAULT_INTEREST, { ...DEFAULT_INTEREST, due_days: '11' })).toBe(false);
  });
});
