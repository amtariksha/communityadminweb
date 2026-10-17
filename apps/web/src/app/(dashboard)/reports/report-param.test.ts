import { describe, expect, it } from 'vitest';
import { reportFromParam } from './report-param';

/** The dashboard's General Ledger card opens a report straight from `?report=`. */
describe('reportFromParam', () => {
  it.each([
    ['trial-balance', 'trial-balance'],
    ['balance-sheet', 'balance-sheet'],
    ['income-expenditure', 'income-expenditure'],
  ])('accepts %s', (value, expected) => {
    expect(reportFromParam(value)).toBe(expected);
  });

  it.each([null, '', 'nope', 'TRIAL-BALANCE', 'defaulters '])('ignores %j', (value) => {
    expect(reportFromParam(value)).toBeNull();
  });
});
