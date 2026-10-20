import { describe, expect, it } from 'vitest';
import { linesWithPayerGst, orDefault, payerInvoiceDefaults } from './payer-defaults';

/** INC-46 — a payer's invoice starts with its Account Head, GST and TDS rates. */
describe('payer invoice defaults', () => {
  it('reads the payer row', () => {
    expect(payerInvoiceDefaults({ default_income_account_id: 'acc-hall', default_gst_rate: '18.00', tds_rate: '2.00' })).toEqual({
      incomeAccountId: 'acc-hall',
      gstRate: '18',
      tdsRate: '2',
    });
    expect(payerInvoiceDefaults({})).toEqual({ incomeAccountId: '', gstRate: '', tdsRate: '' });
  });

  it('fills only the lines and fields not chosen yet', () => {
    const lines = [{ id: 'a', gst_rate: '' }, { id: 'b', gst_rate: '5' }];
    expect(linesWithPayerGst(lines, '18')).toEqual([{ id: 'a', gst_rate: '18' }, { id: 'b', gst_rate: '5' }]);
    expect(linesWithPayerGst(lines, '')).toEqual(lines);
    expect(orDefault('', 'acc-hall')).toBe('acc-hall');
    expect(orDefault('acc-other', 'acc-hall')).toBe('acc-other');
  });
});
