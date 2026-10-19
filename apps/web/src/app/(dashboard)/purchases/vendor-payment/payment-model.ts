import type { OpenBill, VendorPaymentInput, VendorPaymentKind } from '@/hooks/use-vendor-payments';

/**
 * The Pay a vendor form (EXP-14, screen EXP-S9) as plain data. Against
 * invoices: tick rows (Edit Amount defaults to what remains, may be lowered,
 * never raised); Amount paid = Σ edited amounts − TDS at payment; a
 * write-off settles what the edited amounts leave unpaid on the ticked rows.
 * Work is in paise so the figures sent are the figures shown.
 */

export type PayMode = 'invoices' | 'advance' | 'without_invoice';

export interface PayRow {
  ticked: boolean;
  /** Edit Amount as typed. */
  amount: string;
}

export interface PaymentDetails {
  paymentDate: string;
  bankLedgerId: string;
  paymentMode: string;
  instrumentNo: string;
  instrumentDate: string;
  writeOff: string;
  writeOffAccountId: string;
  tds: string;
  notes: string;
  /** Advance / without invoice: the amount paid. */
  amount: string;
  /** Without invoice: the expense head. */
  expenseHead: string;
}

export const paise = (value: string | number | null | undefined): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
export const rupees = (p: number): string => (p / 100).toFixed(2);

export function tickRow(bill: OpenBill, ticked: boolean): PayRow {
  return { ticked, amount: ticked ? bill.remaining : '' };
}

export function tickAll(bills: readonly OpenBill[], ticked: boolean): Record<string, PayRow> {
  return Object.fromEntries(bills.map((bill) => [bill.id, tickRow(bill, ticked)]));
}

/** An edited amount is never more than what remains. */
export function clampAmount(bill: OpenBill, typed: string): string {
  return paise(typed) > paise(bill.remaining) ? bill.remaining : typed;
}

const ticked = (bills: readonly OpenBill[], rows: Record<string, PayRow>): OpenBill[] =>
  bills.filter((bill) => rows[bill.id]?.ticked);

export function editedTotal(bills: readonly OpenBill[], rows: Record<string, PayRow>): number {
  return ticked(bills, rows).reduce((sum, bill) => sum + paise(rows[bill.id].amount), 0);
}

/** Amount paid out of the bank: Σ edited amounts − TDS at payment. */
export function amountPaid(bills: readonly OpenBill[], rows: Record<string, PayRow>, tds: string): number {
  return editedTotal(bills, rows) - paise(tds);
}

/** The most a write-off can be: what the ticked rows still leave after their edited amounts. */
export function writeOffLimit(bills: readonly OpenBill[], rows: Record<string, PayRow>): number {
  return ticked(bills, rows).reduce((sum, bill) => sum + paise(bill.remaining) - paise(rows[bill.id].amount), 0);
}

/** Each ticked row settles its edited amount plus its share of the write-off, oldest row first. */
export function allocations(bills: readonly OpenBill[], rows: Record<string, PayRow>, writeOff: string): VendorPaymentInput['allocations'] {
  let left = paise(writeOff);
  return ticked(bills, rows)
    .map((bill) => {
      const edited = paise(rows[bill.id].amount);
      const share = Math.min(left, paise(bill.remaining) - edited);
      left -= share;
      return { bill_id: bill.id, amount: (edited + share) / 100 };
    })
    .filter((allocation) => allocation.amount > 0);
}

export function paymentIssue(mode: PayMode, bills: readonly OpenBill[], rows: Record<string, PayRow>, details: PaymentDetails): string | null {
  if (!details.paymentDate) return 'Enter the payment date';
  if (!details.bankLedgerId) return 'Pick the bank or cash account it was paid from';
  if (details.paymentMode !== 'cash' && details.instrumentNo.trim().length < 3) return 'Enter the instrument number (3 characters or more)';
  if (mode === 'without_invoice' && !details.expenseHead) return 'Pick the expense head';
  if (mode !== 'invoices') return paise(details.amount) > 0 ? null : 'Enter the amount paid';
  if (ticked(bills, rows).length === 0) return 'Tick at least one invoice';
  if (ticked(bills, rows).some((bill) => paise(rows[bill.id].amount) <= 0)) return 'Each ticked invoice needs an amount';
  if (paise(details.writeOff) > writeOffLimit(bills, rows)) return 'The write-off is more than the ticked invoices leave unpaid';
  if (paise(details.writeOff) > 0 && !details.writeOffAccountId) return 'Pick the write-off account';
  if (paise(details.tds) > 0 && ticked(bills, rows).some((bill) => paise(bill.tds_amount) > 0)) {
    return 'TDS was already deducted on a ticked invoice';
  }
  if (amountPaid(bills, rows, details.tds) <= 0) return 'The amount paid must be above 0';
  return null;
}

const KIND: Record<PayMode, VendorPaymentKind> = { invoices: 'against_invoice', advance: 'advance', without_invoice: 'without_invoice' };

export function toPaymentInput(vendorId: string, mode: PayMode, bills: readonly OpenBill[], rows: Record<string, PayRow>, d: PaymentDetails): VendorPaymentInput {
  const againstInvoices = mode === 'invoices';
  return {
    vendor_id: vendorId,
    kind: KIND[mode],
    payment_date: d.paymentDate,
    bank_account_id: d.bankLedgerId,
    payment_mode: d.paymentMode,
    amount: againstInvoices ? amountPaid(bills, rows, d.tds) / 100 : paise(d.amount) / 100,
    instrument_number: d.instrumentNo.trim() || null,
    instrument_date: d.instrumentDate || null,
    allocations: againstInvoices ? allocations(bills, rows, d.writeOff) : [],
    write_off_amount: againstInvoices ? paise(d.writeOff) / 100 : 0,
    write_off_account_id: againstInvoices && paise(d.writeOff) > 0 ? d.writeOffAccountId : null,
    tds_amount: againstInvoices ? paise(d.tds) / 100 : 0,
    expense_account_id: mode === 'without_invoice' ? d.expenseHead : null,
    notes: d.notes.trim() || null,
  };
}
