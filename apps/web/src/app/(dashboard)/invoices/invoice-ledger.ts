import type { Invoice, InvoiceIncomeScope } from '@communityos/shared';

/** The Ledger filter on /invoices: member, utility or non-member income (INC-14). */
export const INVOICE_LEDGER_OPTIONS = [
  { value: '', label: 'All ledgers' },
  { value: 'member', label: 'Maintenance' },
  { value: 'utility', label: 'Utility' },
  { value: 'non_member', label: 'Non-member' },
] as const satisfies ReadonlyArray<{ value: InvoiceIncomeScope | ''; label: string }>;

export type InvoiceLedger = (typeof INVOICE_LEDGER_OPTIONS)[number]['value'];

/**
 * An API older than INC-14 ignores `?scope=` and sends rows without
 * `income_scope`: the list is then every ledger, not the one asked for.
 */
export function ledgerFilterIgnored(
  ledger: InvoiceLedger,
  rows: ReadonlyArray<Pick<Invoice, 'income_scope'>>,
): boolean {
  return ledger !== '' && rows.length > 0 && rows.every((row) => row.income_scope === undefined);
}
