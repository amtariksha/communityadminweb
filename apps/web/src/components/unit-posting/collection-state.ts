import type { CreateReceiptInput } from '@/hooks/use-receipts';
import type { OpenBill } from '@/hooks/use-unit-statement';

/** Payment modes of Post Collection (INC-S21); online payments come from the gateway. */
export const COLLECTION_MODES = [
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'dd', label: 'DD' },
  { value: 'upi', label: 'UPI' },
] as const;

export type CollectionMode = (typeof COLLECTION_MODES)[number]['value'];

/** Modes whose instrument has a number / is drawn on a bank (the API's rules). */
export const needsNumber = (mode: CollectionMode): boolean => mode === 'cheque' || mode === 'dd' || mode === 'bank_transfer';
export const needsBank = (mode: CollectionMode): boolean => mode === 'cheque' || mode === 'dd';

export interface BillEntry {
  selected: boolean;
  amount: string;
  tds: string;
}

export interface CollectionForm {
  payerMemberId: string;
  /** "Any Invoice on FiFo Basis": the amount is spread oldest-first. */
  fifo: boolean;
  amount: string;
  bills: Record<string, BillEntry>;
  mode: CollectionMode;
  reference: string;
  bank: string;
  instrumentDate: string;
  comments: string;
  /** Empty = the default bank or cash ledger for the mode. */
  bankAccountId: string;
  date: string;
}

export function emptyCollectionForm(today: string, preselected: string | null): CollectionForm {
  return {
    payerMemberId: '',
    fifo: false,
    amount: '',
    bills: preselected ? { [preselected]: { selected: true, amount: '', tds: '' } } : {},
    mode: 'cheque',
    reference: '',
    bank: '',
    instrumentDate: '',
    comments: '',
    bankAccountId: '',
    date: today,
  };
}

const MONEY = /^\d+(\.\d{1,2})?$/;
const money = (text: string): number => (MONEY.test(text.trim()) ? Number(text) : Number.NaN);
const paise = (value: number): number => Math.round(value * 100);

/** Ticked bills with what is paid and withheld on each. */
export function tickedBills(form: CollectionForm, bills: readonly OpenBill[]): Array<{ bill: OpenBill; amount: number; tds: number }> {
  return bills
    .filter((bill) => form.bills[bill.id]?.selected)
    .map((bill) => ({ bill, amount: money(form.bills[bill.id].amount), tds: form.bills[bill.id].tds.trim() ? money(form.bills[bill.id].tds) : 0 }));
}

/** The receipt total: the FiFo amount, or the sum of what is paid on the ticked bills. */
export function collectionTotal(form: CollectionForm, bills: readonly OpenBill[]): number {
  if (form.fifo || bills.length === 0) return money(form.amount) || 0;
  return tickedBills(form, bills).reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0);
}

function billErrors(form: CollectionForm, bills: readonly OpenBill[], errors: Record<string, string>): void {
  const ticked = tickedBills(form, bills);
  if (ticked.length === 0) errors.bills = 'Tick the bills paid, or tick Any Invoice on FiFo Basis';
  for (const row of ticked) {
    const settles = paise(row.amount) + paise(row.tds);
    if (!(row.amount > 0) || !Number.isFinite(row.tds) || row.tds < 0 || settles > paise(Number(row.bill.remaining))) {
      errors[`bill.${row.bill.id}`] = `Amount + TDS up to ${row.bill.remaining}`;
    }
  }
}

export function collectionErrors(form: CollectionForm, bills: readonly OpenBill[]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.payerMemberId) errors.payerMemberId = 'Pick the payer';
  if (form.fifo || bills.length === 0) {
    if (!(money(form.amount) > 0)) errors.amount = 'Enter an amount above zero, at most two decimals';
  } else {
    billErrors(form, bills, errors);
  }
  if (needsNumber(form.mode) && !form.reference.trim()) errors.reference = 'Give the payment number';
  if (needsBank(form.mode) && !form.bank.trim()) errors.bank = 'Give the bank it is drawn on';
  if (!form.date) errors.date = 'Pick the date';
  return errors;
}

export function toCollectionPayload(unitId: string, form: CollectionForm, bills: readonly OpenBill[]): CreateReceiptInput {
  const spread = form.fifo || bills.length === 0;
  return {
    financial_year_id: '',
    unit_id: unitId,
    receipt_date: form.date,
    amount: Math.round(collectionTotal(form, bills) * 100) / 100,
    mode: form.mode,
    reference_number: form.reference.trim() || null,
    bank_account_id: form.bankAccountId || null,
    narration: form.comments.trim(),
    payer_member_id: form.payerMemberId,
    payment_bank: needsBank(form.mode) ? form.bank.trim() : null,
    instrument_date: needsBank(form.mode) && form.instrumentDate ? form.instrumentDate : null,
    ...(spread
      ? { allocation_mode: 'fifo' as const, allocations: [] }
      : {
          allocation_mode: 'selected' as const,
          allocations: tickedBills(form, bills).map((row) => ({
            invoice_id: row.bill.id,
            amount: row.amount,
            ...(row.tds > 0 ? { tds_amount: row.tds } : {}),
          })),
        }),
  };
}
