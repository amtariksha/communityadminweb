import type { IdentifyInput } from '@/hooks/use-unidentified-collections';
import type { OpenBill } from '@/hooks/use-unit-statement';

/**
 * Identify an unidentified collection (INC-48, INC-S22): the unit it came
 * from, then FiFo over its open bills or the bills picked; what is left
 * becomes the unit's advance.
 */
export interface BillPick {
  selected: boolean;
  amount: string;
}

export interface IdentifyForm {
  unitId: string;
  payerMemberId: string;
  fifo: boolean;
  picks: Record<string, BillPick>;
}

export const emptyIdentifyForm = (): IdentifyForm => ({ unitId: '', payerMemberId: '', fifo: true, picks: {} });

const MONEY = /^\d+(\.\d{1,2})?$/;
const paise = (text: string): number => (MONEY.test(text.trim()) ? Math.round(Number(text) * 100) : Number.NaN);

function picked(form: IdentifyForm, bills: readonly OpenBill[]): Array<{ bill: OpenBill; paise: number }> {
  return bills.filter((bill) => form.picks[bill.id]?.selected).map((bill) => ({ bill, paise: paise(form.picks[bill.id].amount) }));
}

export function identifyErrors(form: IdentifyForm, bills: readonly OpenBill[], collectionAmount: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.unitId) errors.unitId = 'Pick the unit the money came from';
  if (form.fifo) return errors;
  let total = 0;
  for (const row of picked(form, bills)) {
    if (!(row.paise > 0) || row.paise > Math.round(Number(row.bill.remaining) * 100)) errors[`bill.${row.bill.id}`] = `Up to ${row.bill.remaining}`;
    total += Number.isFinite(row.paise) ? row.paise : 0;
  }
  if (total > Math.round(Number(collectionAmount) * 100)) errors.bills = 'The bills chosen add up to more than the collection';
  return errors;
}

/** What goes on bills and what is left as the unit's advance (picked bills; FiFo is the server's). */
export function identifySplit(form: IdentifyForm, bills: readonly OpenBill[], collectionAmount: string): { onBills: number; advance: number } {
  const amount = Math.round(Number(collectionAmount) * 100);
  const onBills = form.fifo
    ? Math.min(amount, bills.reduce((sum, bill) => sum + Math.round(Number(bill.remaining) * 100), 0))
    : picked(form, bills).reduce((sum, row) => sum + (Number.isFinite(row.paise) ? row.paise : 0), 0);
  return { onBills: onBills / 100, advance: Math.max(amount - onBills, 0) / 100 };
}

export function toIdentifyPayload(form: IdentifyForm, bills: readonly OpenBill[]): IdentifyInput {
  const payer = form.payerMemberId ? { payer_member_id: form.payerMemberId } : {};
  if (form.fifo) return { unit_id: form.unitId, ...payer, allocation_mode: 'fifo' };
  return {
    unit_id: form.unitId,
    ...payer,
    allocation_mode: 'selected',
    allocations: picked(form, bills).map((row) => ({ invoice_id: row.bill.id, amount: row.paise / 100 })),
  };
}
