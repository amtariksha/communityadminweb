import type { MultiLineInvoiceInput } from '@/hooks/use-unit-posting';

/** INC-24 — the fixed 14-line grid of Post Multi-Line (GST) Invoice. */
export const MULTI_LINE_ROWS = 14;

export interface GridLine {
  ledgerAccountId: string;
  quantity: string;
  amount: string;
  gstRate: string;
  comment: string;
}

export interface MultiLineForm {
  lines: GridLine[];
  invoiceDate: string;
  dueDate: string;
  /** '' = each line's own rate. */
  sameGst: string;
}

export const blankLine = (): GridLine => ({ ledgerAccountId: '', quantity: '1', amount: '', gstRate: '0', comment: '' });

export function emptyMultiLineForm(today: string, dueDate: string): MultiLineForm {
  return { lines: Array.from({ length: MULTI_LINE_ROWS }, blankLine), invoiceDate: today, dueDate, sameGst: '' };
}

/** A line counts once it names an account or an amount; blank lines are ignored. */
export const isUsed = (line: GridLine): boolean => line.ledgerAccountId !== '' || line.amount.trim() !== '';

const toPaise = (rupees: number): number => Math.round(rupees * 100);

/** Quantity × Amount, to the paisa (the server's rule). */
export function linePaise(line: GridLine): number {
  const quantity = Math.round(Number(line.quantity) * 1000);
  const amount = toPaise(Number(line.amount));
  return Number.isFinite(quantity) && Number.isFinite(amount) ? Math.round((quantity * amount) / 1000) : 0;
}

function lineRate(line: GridLine, form: MultiLineForm, withGst: boolean): number {
  if (!withGst) return 0;
  return Number(form.sameGst !== '' ? form.sameGst : line.gstRate) || 0;
}

export function multiLineTotals(form: MultiLineForm, withGst: boolean): { subtotal: number; gst: number; total: number } {
  let subtotal = 0;
  let gst = 0;
  for (const line of form.lines.filter(isUsed)) {
    const value = linePaise(line);
    subtotal += value;
    gst += Math.round((value * Math.round(lineRate(line, form, withGst) * 100)) / 10000);
  }
  return { subtotal: subtotal / 100, gst: gst / 100, total: (subtotal + gst) / 100 };
}

const MONEY = /^\d+(\.\d{1,2})?$/;
const QUANTITY = /^\d+(\.\d{1,3})?$/;

/** Errors keyed "lines.<n>" or the field name. */
export function multiLineErrors(form: MultiLineForm): Record<string, string> {
  const errors: Record<string, string> = {};
  const used = form.lines.map((line, index) => ({ line, index })).filter(({ line }) => isUsed(line));
  if (used.length === 0) errors.lines = 'Add at least one line.';
  for (const { line, index } of used) {
    if (!line.ledgerAccountId) errors[`lines.${index}`] = 'Pick the account';
    else if (!QUANTITY.test(line.quantity.trim()) || !(Number(line.quantity) > 0)) errors[`lines.${index}`] = 'Quantity above zero, at most three decimals';
    else if (!MONEY.test(line.amount.trim()) || !(Number(line.amount) > 0)) errors[`lines.${index}`] = 'Amount above zero, at most two decimals';
  }
  if (!form.invoiceDate) errors.invoiceDate = 'Pick the invoice date';
  if (!form.dueDate) errors.dueDate = 'Pick the due date';
  else if (form.invoiceDate && form.dueDate < form.invoiceDate) errors.dueDate = 'The due date cannot be before the invoice date';
  return errors;
}

export function toMultiLinePayload(unitId: string, form: MultiLineForm, withGst: boolean): MultiLineInvoiceInput {
  return {
    unit_id: unitId,
    invoice_date: form.invoiceDate,
    due_date: form.dueDate,
    with_gst: withGst,
    ...(withGst && form.sameGst !== '' ? { apply_same_gst: Number(form.sameGst) } : {}),
    lines: form.lines.filter(isUsed).map((line) => ({
      ledger_account_id: line.ledgerAccountId,
      quantity: Number(line.quantity),
      amount: Number(line.amount),
      ...(withGst ? { gst_rate: Number(line.gstRate) || 0 } : {}),
      comment: line.comment.trim() || null,
    })),
  };
}
