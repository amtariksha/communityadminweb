import type { AdhocInvoiceInput, PostingOptions, PostingScope } from '@/hooks/use-unit-posting';

/** The Post Invoice form (INC-S18) as typed. */
export interface PostInvoiceForm {
  amount: string;
  ledgerAccountId: string;
  comment: string;
  invoiceDate: string;
  /** Empty = invoice date + the society's due days. */
  dueDate: string;
  notApplicable: boolean;
  periodFrom: string;
  periodTo: string;
  applyGst: boolean;
  gstRate: string;
  asDebitNote: boolean;
}

export type PostInvoiceErrors = Partial<Record<keyof PostInvoiceForm, string>>;

export function emptyPostInvoiceForm(today: string): PostInvoiceForm {
  return {
    amount: '',
    ledgerAccountId: '',
    comment: '',
    invoiceDate: today,
    dueDate: '',
    notApplicable: true,
    periodFrom: '',
    periodTo: '',
    applyGst: false,
    gstRate: '',
    asDebitNote: false,
  };
}

/** Invoice date + `days`, the due date the server uses when none is given. */
export function defaultDueDate(invoiceDate: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) return '';
  const date = new Date(`${invoiceDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const MONEY = /^\d+(\.\d{1,2})?$/;

export function postInvoiceErrors(form: PostInvoiceForm, options: PostingOptions | undefined): PostInvoiceErrors {
  const errors: PostInvoiceErrors = {};
  const amount = Number(form.amount);
  if (!MONEY.test(form.amount.trim()) || !(amount > 0)) errors.amount = 'Enter an amount above zero, at most two decimals';
  else if (amount > 10_000_000) errors.amount = 'At most ₹1,00,00,000';
  if (!form.ledgerAccountId) errors.ledgerAccountId = 'Pick the account';
  if (!form.invoiceDate) errors.invoiceDate = 'Pick the invoice date';
  if (form.dueDate && form.invoiceDate && form.dueDate < form.invoiceDate) errors.dueDate = 'The due date cannot be before the invoice date';
  if (!form.notApplicable && (!form.periodFrom || !form.periodTo)) errors.periodFrom = 'Give the period, or tick Not Applicable';
  if (!form.notApplicable && form.periodFrom && form.periodTo && form.periodFrom > form.periodTo) errors.periodTo = 'Period To cannot be before Period From';
  if (form.applyGst && options?.show_gst_on_adhoc !== false && !form.gstRate) errors.gstRate = 'Pick the GST rate';
  return errors;
}

export function toAdhocPayload(
  unitId: string,
  form: PostInvoiceForm,
  options: PostingOptions | undefined,
  scope: PostingScope = 'member',
): AdhocInvoiceInput {
  const applyGst = form.applyGst && options?.show_gst_on_adhoc !== false;
  return {
    unit_id: unitId,
    amount: Number(form.amount),
    ledger_account_id: form.ledgerAccountId,
    comment: form.comment.trim() || null,
    invoice_date: form.invoiceDate,
    ...(form.dueDate ? { due_date: form.dueDate } : {}),
    period_not_applicable: form.notApplicable,
    ...(form.notApplicable ? {} : { period_from: form.periodFrom, period_to: form.periodTo }),
    apply_gst: applyGst,
    ...(applyGst ? { gst_rate: Number(form.gstRate) } : {}),
    as_debit_note: form.asDebitNote,
    ...(scope === 'utility' ? { scope } : {}),
  };
}

/**
 * UTIL-08 — utility dues may only be posted by an API that knows the scope:
 * an older one would drop it and post the invoice as maintenance.
 */
export function utilityScopeMissing(scope: PostingScope, options: PostingOptions | undefined): boolean {
  return scope === 'utility' && options !== undefined && options.scope !== 'utility';
}
