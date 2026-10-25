import { describe, expect, it } from 'vitest';
import { isReversible, reverseConfirmText, sourceLabel } from './journal-labels';

describe('journal entry source labels', () => {
  it('names both Tally imports, and shows an unknown source as stored', () => {
    expect(sourceLabel('tally_voucher')).toBe('Tally Import');
    expect(sourceLabel('tally_csv')).toBe('Tally import (CSV)');
    expect(sourceLabel('receipt')).toBe('Collection');
    expect(sourceLabel('something_new')).toBe('something_new');
  });
});

describe('Reverse in the general journal (G6, widened by Q8)', () => {
  it('takes a manual or Tally CSV entry not yet reversed', () => {
    expect(isReversible({ source_type: 'manual', is_reversed: false })).toBe(true);
    expect(isReversible({ source_type: 'tally_csv', is_reversed: false })).toBe(true);
    expect(isReversible({ source_type: 'tally_csv', is_reversed: true })).toBe(false);
  });

  it('leaves XML imports, documents, vendor entries and reversals to their own screens', () => {
    for (const source of ['tally_voucher', 'invoice', 'receipt', 'vendor_payment', 'reversal', 'opening_balance']) {
      expect(isReversible({ source_type: source, is_reversed: false })).toBe(false);
    }
  });

  it('tells the user a Tally CSV re-import does not post the row back', () => {
    expect(reverseConfirmText({ entry_number: 4, source_type: 'manual' })).toBe(
      'This posts a new entry dated today that mirrors #4. The original stays in the books.',
    );
    expect(reverseConfirmText({ entry_number: 5, source_type: 'tally_csv' })).toBe(
      'This posts a new entry dated today that mirrors #5. The original stays in the books. Importing the same Tally file again does not post it back.',
    );
  });
});
