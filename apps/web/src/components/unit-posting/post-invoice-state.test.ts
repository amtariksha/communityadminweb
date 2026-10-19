import { describe, expect, it } from 'vitest';
import { defaultDueDate, emptyPostInvoiceForm, postInvoiceErrors, toAdhocPayload, type PostInvoiceForm } from './post-invoice-state';

const options = { show_gst_on_adhoc: true, gst_rates: [5, 18, 40], due_days: 10, date: '2026-10-15' };
const filled = (patch: Partial<PostInvoiceForm> = {}): PostInvoiceForm => ({
  ...emptyPostInvoiceForm('2026-10-15'),
  amount: '5000',
  ledgerAccountId: 'acct-fine',
  ...patch,
});

describe('Post Invoice form state', () => {
  it('defaults the due date from the society due days', () => {
    expect(defaultDueDate('2026-10-25', 10)).toBe('2026-11-04');
    expect(defaultDueDate('', 10)).toBe('');
  });

  it('accepts a plain charge and sends no period, GST or due date of its own', () => {
    expect(postInvoiceErrors(filled(), options)).toEqual({});
    expect(toAdhocPayload('u-1', filled({ comment: '  Fine for parking ' }), options)).toEqual({
      unit_id: 'u-1',
      amount: 5000,
      ledger_account_id: 'acct-fine',
      comment: 'Fine for parking',
      invoice_date: '2026-10-15',
      period_not_applicable: true,
      apply_gst: false,
      as_debit_note: false,
    });
  });

  it('asks for what is missing or wrong', () => {
    expect(postInvoiceErrors(filled({ amount: '0' }), options).amount).toBeDefined();
    expect(postInvoiceErrors(filled({ amount: '10.005' }), options).amount).toBeDefined();
    expect(postInvoiceErrors(filled({ ledgerAccountId: '' }), options).ledgerAccountId).toBeDefined();
    expect(postInvoiceErrors(filled({ dueDate: '2026-10-01' }), options).dueDate).toBeDefined();
    expect(postInvoiceErrors(filled({ notApplicable: false }), options).periodFrom).toBeDefined();
    expect(postInvoiceErrors(filled({ applyGst: true }), options).gstRate).toBeDefined();
  });

  it('sends GST, the period and a debit note when chosen', () => {
    expect(
      toAdhocPayload('u-1', filled({ applyGst: true, gstRate: '18', notApplicable: false, periodFrom: '2026-10-01', periodTo: '2026-10-31', asDebitNote: true, dueDate: '2026-10-30' }), options),
    ).toMatchObject({ apply_gst: true, gst_rate: 18, period_from: '2026-10-01', period_to: '2026-10-31', as_debit_note: true, due_date: '2026-10-30' });
  });

  it('never sends GST when Setup › GST has the option off', () => {
    const off = { ...options, show_gst_on_adhoc: false };
    expect(postInvoiceErrors(filled({ applyGst: true }), off).gstRate).toBeUndefined();
    expect(toAdhocPayload('u-1', filled({ applyGst: true, gstRate: '18' }), off)).toMatchObject({ apply_gst: false });
  });
});
