import { describe, expect, it } from 'vitest';
import type { OpenBill } from '@/hooks/use-unit-statement';
import { collectionErrors, collectionTotal, emptyCollectionForm, toCollectionPayload, type CollectionForm } from './collection-state';

const bill = (id: string, remaining: string): OpenBill => ({
  id,
  invoice_number: `INV-${id}`,
  bill_date: '2026-09-01',
  due_date: '2026-09-11',
  account: 'Maintenance',
  details: 'Sep 2026',
  bill_amount: remaining,
  remaining,
  income_scope: 'member',
});

const bills = [bill('a', '10000.00'), bill('b', '10000.00')];
const cheque = (patch: Partial<CollectionForm> = {}): CollectionForm => ({
  ...emptyCollectionForm('2026-10-15', null),
  payerMemberId: 'm-1',
  reference: '445566',
  bank: 'Test Bank',
  ...patch,
});

describe('Post Collection form state', () => {
  it('pays a ticked bill with cash and TDS', () => {
    const form = cheque({ bills: { a: { selected: true, amount: '9000', tds: '1000' } } });

    expect(collectionErrors(form, bills)).toEqual({});
    expect(collectionTotal(form, bills)).toBe(9000);
    expect(toCollectionPayload('u', form, bills)).toMatchObject({
      amount: 9000,
      mode: 'cheque',
      payment_bank: 'Test Bank',
      payer_member_id: 'm-1',
      allocation_mode: 'selected',
      allocations: [{ invoice_id: 'a', amount: 9000, tds_amount: 1000 }],
    });
  });

  it('spreads the amount FiFo when ticked', () => {
    const form = cheque({ fifo: true, amount: '15000' });
    expect(toCollectionPayload('u', form, bills)).toMatchObject({ amount: 15000, allocation_mode: 'fifo', allocations: [] });
  });

  it('takes an amount as an advance when the unit has no open bills', () => {
    const form = cheque({ amount: '500' });
    expect(collectionErrors(form, [])).toEqual({});
    expect(toCollectionPayload('u', form, [])).toMatchObject({ amount: 500, allocation_mode: 'fifo' });
  });

  it('refuses amount + TDS beyond what the bill has left', () => {
    const form = cheque({ bills: { a: { selected: true, amount: '9500', tds: '1000' } } });
    expect(collectionErrors(form, bills)['bill.a']).toBe('Amount + TDS up to 10000.00');
  });

  it('asks a cheque for its number and bank, and a cash payment for neither', () => {
    const ticked = { bills: { a: { selected: true, amount: '100', tds: '' } } };
    expect(collectionErrors(cheque({ ...ticked, bank: '' }), bills).bank).toBeDefined();
    expect(collectionErrors(cheque({ ...ticked, reference: '' }), bills).reference).toBeDefined();
    expect(collectionErrors(cheque({ ...ticked, mode: 'cash', reference: '', bank: '' }), bills)).toEqual({});
    expect(collectionErrors(cheque({ ...ticked, mode: 'bank_transfer', bank: '' }), bills)).toEqual({});
    expect(toCollectionPayload('u', cheque({ ...ticked, mode: 'bank_transfer' }), bills).payment_bank).toBeNull();
  });

  it('asks for the payer and for a bill or FiFo', () => {
    const errors = collectionErrors(cheque({ payerMemberId: '' }), bills);
    expect(errors.payerMemberId).toBeDefined();
    expect(errors.bills).toBeDefined();
  });
});
