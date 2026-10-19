import type { OpenBill } from '@/hooks/use-unit-statement';
import type { UnitCreditNoteInput } from '@/hooks/use-unit-posting';

/** The three credit-note pages of a unit (INC-S20), as in ?kind= of the route. */
export type CreditNotePage = 'general' | 'account' | 'specific';

export function creditNotePageFrom(value: string | null): CreditNotePage {
  return value === 'account' || value === 'specific' ? value : 'general';
}

export const CREDIT_NOTE_TITLES: Record<CreditNotePage, string> = {
  general: 'Post a General Credit Note',
  account: 'Post an Account Specific Credit Note',
  specific: 'Post Specific Credit Note',
};

export interface CreditNoteForm {
  amount: string;
  ledgerAccountId: string;
  reason: string;
  date: string;
  payerMemberId: string;
  /** Specific: the amount typed against each ticked bill. */
  bills: Record<string, { selected: boolean; amount: string }>;
}

export function emptyCreditNoteForm(today: string): CreditNoteForm {
  return { amount: '', ledgerAccountId: '', reason: '', date: today, payerMemberId: '', bills: {} };
}

const MONEY = /^\d+(\.\d{1,2})?$/;
const validAmount = (text: string): boolean => MONEY.test(text.trim()) && Number(text) > 0;

export function creditNoteErrors(page: CreditNotePage, form: CreditNoteForm, openBills: readonly OpenBill[]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.reason.trim()) errors.reason = 'Comments are required';
  if (!form.date) errors.date = 'Pick the date';
  if (page !== 'specific' && !validAmount(form.amount)) errors.amount = 'Enter an amount above zero, at most two decimals';
  if (page === 'account' && !form.ledgerAccountId) errors.ledgerAccountId = 'Pick the account';
  if (page !== 'specific') return errors;
  if (!form.payerMemberId) errors.payerMemberId = 'Pick the payer';
  const chosen = openBills.filter((bill) => form.bills[bill.id]?.selected);
  if (chosen.length === 0) errors.bills = 'Select at least one bill';
  for (const bill of chosen) {
    const typed = form.bills[bill.id].amount;
    if (!validAmount(typed) || Number(typed) > Number(bill.remaining)) {
      errors[`bill.${bill.id}`] = `Up to ${bill.remaining}`;
    }
  }
  return errors;
}

export function toCreditNotePayload(unitId: string, page: CreditNotePage, form: CreditNoteForm, openBills: readonly OpenBill[]): UnitCreditNoteInput {
  const common = {
    unit_id: unitId,
    reason: form.reason.trim(),
    credit_note_date: form.date,
    ...(form.payerMemberId ? { payer_member_id: form.payerMemberId } : {}),
  };
  if (page === 'specific') {
    const bills = openBills
      .filter((bill) => form.bills[bill.id]?.selected)
      .map((bill) => ({ invoice_id: bill.id, amount: Number(form.bills[bill.id].amount) }));
    return { ...common, kind: 'specific', bills };
  }
  if (page === 'account') return { ...common, kind: 'account_specific', ledger_account_id: form.ledgerAccountId, amount: Number(form.amount) };
  return { ...common, kind: 'general', amount: Number(form.amount) };
}
