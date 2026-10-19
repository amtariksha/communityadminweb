import { describe, expect, it } from 'vitest';
import type { OpenBill } from '@/hooks/use-unit-statement';
import { emptyCollectionForm, fifoOverBills, toCollectionPayload, type CollectionForm } from './collection-state';
import { emptyPostInvoiceForm, toAdhocPayload, utilityScopeMissing } from './post-invoice-state';

/** UTIL-08 — the posting forms on the utility ledger (Utility Income). */
const bill = (id: string, remaining: string): OpenBill => ({
  id,
  invoice_number: `INV-${id}`,
  bill_date: '2026-09-01',
  due_date: '2026-09-11',
  account: 'Water charges',
  details: 'Sep 2026',
  bill_amount: remaining,
  remaining,
  income_scope: 'utility',
});
const options = { show_gst_on_adhoc: true, gst_rates: [5, 18, 40], due_days: 92, date: '2026-10-01' };

describe('Post Invoice on scope utility', () => {
  const form = { ...emptyPostInvoiceForm('2026-10-01'), amount: '450', ledgerAccountId: 'acct-water' };

  it('sends the scope for utility dues and leaves member postings as they were', () => {
    expect(toAdhocPayload('u-1', form, options, 'utility')).toMatchObject({ scope: 'utility', amount: 450 });
    expect(toAdhocPayload('u-1', form, options)).not.toHaveProperty('scope');
  });

  it('refuses to post utility dues through an API that does not know the scope', () => {
    expect(utilityScopeMissing('utility', options)).toBe(true);
    expect(utilityScopeMissing('utility', { ...options, scope: 'utility' })).toBe(false);
    expect(utilityScopeMissing('member', options)).toBe(false);
    expect(utilityScopeMissing('utility', undefined)).toBe(false);
  });
});

describe('Post Collection on scope utility', () => {
  const bills = [bill('a', '300.00'), bill('b', '450.00')];
  const fifo = (amount: string): CollectionForm => ({ ...emptyCollectionForm('2026-10-15', null), mode: 'cash', fifo: true, amount, payerMemberId: 'm-1' });

  it('spreads the amount over the utility bills only, oldest first, the rest an advance', () => {
    expect(fifoOverBills(500, bills)).toEqual([
      { invoice_id: 'a', amount: 300 },
      { invoice_id: 'b', amount: 200 },
    ]);
    expect(fifoOverBills(1000, bills)).toEqual([
      { invoice_id: 'a', amount: 300 },
      { invoice_id: 'b', amount: 450 },
    ]);
  });

  it('sends chosen allocations, never the server-wide FIFO, for utility dues', () => {
    expect(toCollectionPayload('u-1', fifo('500'), bills, 'utility')).toMatchObject({
      amount: 500,
      allocation_mode: 'selected',
      allocations: [
        { invoice_id: 'a', amount: 300 },
        { invoice_id: 'b', amount: 200 },
      ],
    });
    expect(toCollectionPayload('u-1', fifo('500'), [], 'utility')).toMatchObject({ allocation_mode: 'selected', allocations: [] });
    expect(toCollectionPayload('u-1', fifo('500'), bills)).toMatchObject({ allocation_mode: 'fifo', allocations: [] });
  });
});
