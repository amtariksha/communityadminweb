import type { CreateReceiptInput } from '@/hooks/use-receipts';
import type { OpenBill } from '@/hooks/use-unit-statement';
import { collectionErrors, collectionTotal, needsBank, tickedBills, type CollectionForm } from './collection-state';

/**
 * Post Collection against a non-member payer's invoices (INC-45). The same
 * form as a unit's (INC-S21) less the payer select; a payer holds no
 * advance, so the whole amount must go on its open invoices.
 */
const paise = (value: number): number => Math.round(value * 100);

/** What the payer owes on its open invoices. */
export function payerDue(bills: readonly OpenBill[]): number {
  return bills.reduce((sum, bill) => sum + paise(Number(bill.remaining)), 0) / 100;
}

export function payerCollectionErrors(form: CollectionForm, bills: readonly OpenBill[]): Record<string, string> {
  const errors: Record<string, string> = { ...collectionErrors({ ...form, payerMemberId: 'payer' }, bills) };
  if (bills.length === 0) errors.bills = 'This payer has no open invoices to collect against.';
  const due = payerDue(bills);
  if (form.fifo && !errors.amount && paise(collectionTotal(form, bills)) > paise(due)) {
    errors.amount = `A payer holds no advance: at most ${due.toFixed(2)}, what it owes`;
  }
  return errors;
}

export function toPayerCollectionPayload(customerId: string, form: CollectionForm, bills: readonly OpenBill[]): CreateReceiptInput {
  const allocation = form.fifo
    ? { allocation_mode: 'fifo' as const, allocations: [] }
    : {
        allocation_mode: 'selected' as const,
        allocations: tickedBills(form, bills).map((row) => ({
          invoice_id: row.bill.id,
          amount: row.amount,
          ...(row.tds > 0 ? { tds_amount: row.tds } : {}),
        })),
      };
  return {
    financial_year_id: '',
    customer_id: customerId,
    receipt_date: form.date,
    amount: paise(collectionTotal(form, bills)) / 100,
    mode: form.mode,
    reference_number: form.reference.trim() || null,
    bank_account_id: form.bankAccountId || null,
    narration: form.comments.trim(),
    payment_bank: needsBank(form.mode) ? form.bank.trim() : null,
    instrument_date: needsBank(form.mode) && form.instrumentDate ? form.instrumentDate : null,
    ...allocation,
  };
}
