import { describe, expect, it } from 'vitest';
import { sourceLabel } from './journal-labels';

describe('journal entry source labels', () => {
  it('names both Tally imports, and shows an unknown source as stored', () => {
    expect(sourceLabel('tally_voucher')).toBe('Tally Import');
    expect(sourceLabel('tally_csv')).toBe('Tally import (CSV)');
    expect(sourceLabel('receipt')).toBe('Collection');
    expect(sourceLabel('something_new')).toBe('something_new');
  });
});
