import { describe, expect, it } from 'vitest';
import type { OpenBill } from '@/hooks/use-unit-statement';
import { emptyCollectionForm, type CollectionForm } from './collection-state';
import { payerCollectionErrors, payerDue, toPayerCollectionPayload } from './payer-collection-state';

/** INC-45 — a non-member payer's collection: its invoices only, no advance. */

const bill = (id: string, remaining: string): OpenBill => ({
  id,
  invoice_number: `NM-${id}`,
  bill_date: '2026-09-01',
  due_date: '2026-09-16',
  account: 'Hall Hire',
  details: 'Hall booking',
  bill_amount: remaining,
  remaining,
  income_scope: 'non_member',
});

const bills = [bill('a', '11800.00'), bill('b', '500.00')];
const cash = (patch: Partial<CollectionForm> = {}): CollectionForm => ({ ...emptyCollectionForm('2026-10-20', null), mode: 'cash', ...patch });

describe('payer collection state', () => {
  it('adds up what the payer owes', () => {
    expect(payerDue(bills)).toBe(12300);
  });

  it('needs no payer member and pays a ticked invoice in full', () => {
    const form = cash({ bills: { a: { selected: true, amount: '11800', tds: '' } } });

    expect(payerCollectionErrors(form, bills)).toEqual({});
    expect(toPayerCollectionPayload('c-1', form, bills)).toEqual({
      financial_year_id: '',
      customer_id: 'c-1',
      receipt_date: '2026-10-20',
      amount: 11800,
      mode: 'cash',
      reference_number: null,
      bank_account_id: null,
      narration: '',
      payment_bank: null,
      instrument_date: null,
      allocation_mode: 'selected',
      allocations: [{ invoice_id: 'a', amount: 11800 }],
    });
  });

  it('refuses a FiFo amount above what the payer owes', () => {
    const errors = payerCollectionErrors(cash({ fifo: true, amount: '12000.01' }), [bill('a', '11800.00')]);

    expect(errors.amount).toMatch(/no advance/);
  });

  it('spreads a FiFo amount on the server and sends TDS on a ticked bill', () => {
    expect(toPayerCollectionPayload('c-1', cash({ fifo: true, amount: '12300' }), bills)).toMatchObject({ amount: 12300, allocation_mode: 'fifo', allocations: [] });
    const withTds = cash({ bills: { a: { selected: true, amount: '10620', tds: '1180' } } });
    expect(payerCollectionErrors(withTds, bills)).toEqual({});
    expect(toPayerCollectionPayload('c-1', withTds, bills).allocations).toEqual([{ invoice_id: 'a', amount: 10620, tds_amount: 1180 }]);
  });

  it('has nothing to collect when the payer owes nothing', () => {
    expect(payerCollectionErrors(cash({ amount: '100' }), []).bills).toMatch(/no open invoices/);
  });
});
