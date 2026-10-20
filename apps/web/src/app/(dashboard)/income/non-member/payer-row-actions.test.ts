import { describe, expect, it, vi } from 'vitest';
import type { Party } from '../../vendor-master/party-form';
import { payerDueText, payerRowActions } from './payer-row-actions';

/** INC-46 — the payer list's row buttons by finance role, and the Due text. */
const handlers = { invoice: vi.fn(), collection: vi.fn() };
const row = { id: 'c-1', name: 'Sunrise Events', outstanding: '5000.00' } as Party;

describe('payer row actions', () => {
  it('gives a finance writer View, Invoice, Collection and Edit', () => {
    const actions = payerRowActions({ canRead: true, canWrite: true }, handlers);
    expect(actions.map((action) => action.header)).toEqual(['View', 'Invoice', 'Collection', 'Edit']);
    expect(actions[0].href?.(row)).toBe('/income/non-member/payers/c-1/statement');
    expect(actions[3].href?.(row)).toBe('/income/non-member/payers/c-1/edit');
  });

  it('gives a finance reader View only, and nobody else anything', () => {
    expect(payerRowActions({ canRead: true, canWrite: false }, handlers).map((action) => action.key)).toEqual(['view']);
    expect(payerRowActions({ canRead: false, canWrite: false }, handlers)).toEqual([]);
  });

  it("shows what the payer owes, or a dash on an API that does not send it", () => {
    expect(payerDueText(row, (value) => `Rs ${value}`)).toBe('Rs 5000');
    expect(payerDueText({ outstanding: undefined }, String)).toBe('—');
  });
});
