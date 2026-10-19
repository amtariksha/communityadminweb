import { describe, expect, it } from 'vitest';
import { INVOICE_LEDGER_OPTIONS, ledgerFilterIgnored } from './invoice-ledger';

describe('invoice ledger filter (INC-14)', () => {
  it('offers All, Maintenance, Utility and Non-member', () => {
    expect(INVOICE_LEDGER_OPTIONS.map((o) => o.label)).toEqual([
      'All ledgers',
      'Maintenance',
      'Utility',
      'Non-member',
    ]);
    expect(INVOICE_LEDGER_OPTIONS.map((o) => o.value)).toEqual(['', 'member', 'utility', 'non_member']);
  });

  it('notices an API that does not filter by ledger yet', () => {
    expect(ledgerFilterIgnored('utility', [{}, {}])).toBe(true);
    expect(ledgerFilterIgnored('utility', [{ income_scope: 'utility' }])).toBe(false);
    expect(ledgerFilterIgnored('', [{}])).toBe(false);
    expect(ledgerFilterIgnored('utility', [])).toBe(false);
  });
});
