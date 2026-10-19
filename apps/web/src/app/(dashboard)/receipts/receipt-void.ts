import type { Receipt, ReceiptMode } from '@communityos/shared';

/**
 * The payment mode of a listed receipt. The API stores it as `payment_mode`;
 * `mode` is only the request-side name, so lists read the former first.
 */
export function receiptModeOf(receipt: Pick<Receipt, 'mode' | 'payment_mode'>): ReceiptMode {
  return receipt.payment_mode ?? receipt.mode;
}

/**
 * INC-27 — whether the Void action is offered on a receipt row. A voided
 * receipt cannot be voided again, and an online payment is refunded through
 * the gateway instead (the API refuses both; this only hides the button).
 */
export function mayVoidReceipt(receipt: Pick<Receipt, 'mode' | 'payment_mode' | 'voided_at'>): boolean {
  if (receipt.voided_at) return false;
  return receiptModeOf(receipt) !== 'online';
}
