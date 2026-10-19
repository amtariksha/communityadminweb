import { describe, expect, it } from 'vitest';
import type { OpenBill } from '@/hooks/use-unit-statement';
import { creditNoteErrors, creditNotePageFrom, emptyCreditNoteForm, toCreditNotePayload } from './credit-note-state';

const bill = (id: string, remaining: string): OpenBill => ({
  id,
  invoice_number: `INV-${id}`,
  bill_date: '2026-09-01',
  due_date: '2026-09-11',
  account: 'Maintenance',
  details: 'Sep 2026',
  bill_amount: '1000.00',
  remaining,
  income_scope: 'member',
});

describe('credit note form state', () => {
  const bills = [bill('a', '1000.00'), bill('b', '800.00')];

  it('reads the page from ?kind=', () => {
    expect(creditNotePageFrom('specific')).toBe('specific');
    expect(creditNotePageFrom('account')).toBe('account');
    expect(creditNotePageFrom(null)).toBe('general');
  });

  it('sends a general note with its amount and comments', () => {
    const form = { ...emptyCreditNoteForm('2026-10-15'), amount: '500', reason: ' Goodwill ' };
    expect(creditNoteErrors('general', form, bills)).toEqual({});
    expect(toCreditNotePayload('u', 'general', form, bills)).toEqual({
      unit_id: 'u',
      reason: 'Goodwill',
      credit_note_date: '2026-10-15',
      kind: 'general',
      amount: 500,
    });
  });

  it('sends the account of an account-specific note', () => {
    const form = { ...emptyCreditNoteForm('2026-10-15'), amount: '400', reason: 'x', ledgerAccountId: 'parking' };
    expect(toCreditNotePayload('u', 'account', form, bills)).toMatchObject({ kind: 'account_specific', ledger_account_id: 'parking', amount: 400 });
    expect(creditNoteErrors('account', { ...form, ledgerAccountId: '' }, bills).ledgerAccountId).toBeDefined();
  });

  it('sends only the ticked bills of a specific note, each up to what it has left', () => {
    const form = {
      ...emptyCreditNoteForm('2026-10-15'),
      reason: 'Lift down',
      payerMemberId: 'm-1',
      bills: { a: { selected: false, amount: '' }, b: { selected: true, amount: '200' } },
    };
    expect(creditNoteErrors('specific', form, bills)).toEqual({});
    expect(toCreditNotePayload('u', 'specific', form, bills)).toMatchObject({
      kind: 'specific',
      payer_member_id: 'm-1',
      bills: [{ invoice_id: 'b', amount: 200 }],
    });
    const tooMuch = { ...form, bills: { b: { selected: true, amount: '900' } } };
    expect(creditNoteErrors('specific', tooMuch, bills)['bill.b']).toBe('Up to 800.00');
    expect(creditNoteErrors('specific', { ...form, bills: {} }, bills).bills).toBeDefined();
    expect(creditNoteErrors('specific', { ...form, payerMemberId: '' }, bills).payerMemberId).toBeDefined();
  });
});
