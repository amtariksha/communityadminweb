import { describe, expect, it } from 'vitest';
import { creditableInvoices } from './credit-note-invoices';

const inv = (id: string, status: string, balance: number) => ({
  id,
  invoice_number: `INV-${id}`,
  status,
  balance_due: balance,
});

describe('creditableInvoices', () => {
  it('keeps posted invoices that still have a balance', () => {
    const list = [
      inv('1', 'sent', 500),
      inv('2', 'partially_paid', 200),
      inv('3', 'overdue', '300.50' as unknown as number),
    ];
    expect(creditableInvoices(list).map((i) => i.id)).toEqual(['1', '2', '3']);
  });

  it('drops drafts (cancel those instead), cancelled and paid invoices, and anything with no balance', () => {
    const list = [
      inv('1', 'draft', 500),
      inv('2', 'cancelled', 500),
      inv('3', 'paid', 0),
      inv('4', 'sent', 0),
      inv('5', 'sent', 100),
    ];
    expect(creditableInvoices(list).map((i) => i.id)).toEqual(['5']);
  });
});
