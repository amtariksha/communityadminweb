import { describe, expect, it } from 'vitest';
import { editBody, editIssue, headerFromBill, rowsFromBill, type EditableBill } from './edit-bill';

/**
 * EXP-S10 / D2 — editing an invoice from its statement: the form is filled
 * from the invoice, the body sent to PATCH /purchases/bills/:id leaves the
 * vendor out, and an invoice whose GST was never split per line is refused
 * (it would lose its GST on this form).
 */

const bill: EditableBill = {
  id: 'b3',
  vendor_id: 'v1',
  bill_number: 'BILL-00003',
  vendor_invoice_number: 'CW-2',
  bill_date: '2026-06-10',
  due_date: '2026-07-10T00:00:00.000Z',
  tds_basis: 'percent_excl_gst',
  tds_value: '2.00',
  tds_amount: '30.00',
  tds_section: '393(1)',
  payee_name: 'Clearwater Tank Services',
};

describe('editing a vendor invoice', () => {
  it('fills the header and lines from the invoice', () => {
    expect(headerFromBill(bill)).toEqual({
      vendorId: 'v1',
      invoiceNo: 'CW-2',
      invoiceDate: '2026-06-10',
      dueDate: '2026-07-10',
      tdsValue: '2',
      tdsBasis: 'percent_excl_gst',
      tdsSection: '393(1)',
      payeeName: 'Clearwater Tank Services',
    });
    const rows = rowsFromBill([
      { ledger_account_id: 'h1', description: 'Tank cleaning', hsn_sac: '998719', taxable_amount: '1000.00', gst_type: 'cgst_sgst', gst_rate: '18.00' },
      { ledger_account_id: 'h2', description: null, hsn_sac: null, taxable_amount: '500.00', gst_type: 'igst', gst_rate: '5.00' },
    ]);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toMatchObject({ head: 'h1', amount: '1000', cgstSgstRate: '18', igstRate: '' });
    expect(rows[1]).toMatchObject({ head: 'h2', amount: '500', cgstSgstRate: '', igstRate: '5' });
  });

  it('reads an amount-basis TDS from the old single figure', () => {
    expect(headerFromBill({ ...bill, tds_basis: null, tds_value: null, tds_amount: '150.00' })).toMatchObject({ tdsValue: '150', tdsBasis: 'amount' });
    expect(headerFromBill({ ...bill, tds_basis: null, tds_value: null, tds_amount: '0.00' })).toMatchObject({ tdsValue: '' });
  });

  it('refuses an invoice whose GST was never split per line', () => {
    expect(editIssue([{ ledger_account_id: 'h1', description: null, hsn_sac: null, taxable_amount: '1000', gst_type: 'unsplit', gst_rate: '0' }])).toMatch(/Cancel it and post it again/);
    expect(editIssue([{ ledger_account_id: 'h1', description: null, hsn_sac: null, taxable_amount: '1000', gst_type: 'none', gst_rate: '0' }])).toBeNull();
  });

  it('sends the invoice without its vendor, which stays', () => {
    const body = editBody({
      vendor_id: 'v1',
      vendor_invoice_number: 'CW-2',
      bill_date: '2026-06-10',
      due_date: '2026-07-10',
      lines: [{ ledger_account_id: 'h1', description: null, hsn_sac: null, taxable_amount: 1200, gst_type: 'none', gst_rate: 0 }],
      tds: null,
      payee_name: null,
    });
    expect(body).not.toHaveProperty('vendor_id');
    expect(body).toMatchObject({ vendor_invoice_number: 'CW-2', lines: [{ taxable_amount: 1200 }] });
  });
});
