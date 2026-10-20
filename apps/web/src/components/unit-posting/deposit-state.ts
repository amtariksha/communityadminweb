import type { TakeDepositInput } from '@/hooks/use-refundable-deposits';
import { collectionErrors, needsBank, type CollectionForm } from './collection-state';

/**
 * Post a Refundable Deposit (INC-47): the collection form's payment block
 * with an amount and a description, held for the unit instead of paying
 * its bills. The payer is optional.
 */
export function depositErrors(form: CollectionForm): Record<string, string> {
  // The payer is optional here; with no bills the collection rules check the amount.
  const errors = collectionErrors({ ...form, payerMemberId: form.payerMemberId || 'not-given' }, []);
  if (form.comments.length > 1000) errors.comments = 'At most 1,000 characters';
  return errors;
}

export function toDepositPayload(unitId: string, form: CollectionForm): TakeDepositInput {
  return {
    unit_id: unitId,
    ...(form.payerMemberId ? { payer_member_id: form.payerMemberId } : {}),
    amount: Math.round(Number(form.amount) * 100) / 100,
    receipt_date: form.date,
    mode: form.mode,
    reference_number: form.reference.trim() || null,
    payment_bank: needsBank(form.mode) ? form.bank.trim() : null,
    instrument_date: needsBank(form.mode) && form.instrumentDate ? form.instrumentDate : null,
    bank_account_id: form.bankAccountId || null,
    description: form.comments.trim() || null,
  };
}
