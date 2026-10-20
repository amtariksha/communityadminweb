import type { DataTableAction } from '@/components/data-table';
import type { FinanceAccess } from '@/lib/finance-roles';
import type { Party } from '../../vendor-master/party-form';
import { payerEditHref, payerStatementHref } from './non-member-routes';

export interface PayerRowHandlers {
  /** Invoice: a new non-member invoice for the payer, starting from its defaults. */
  invoice: (row: Party) => void;
  /** Collection: the payer's open invoices (a page in classic, a dialog in standard). */
  collection: (row: Party) => void;
}

/**
 * The row buttons of Non Member Income › By Vendors (INC-S30), each in a
 * column of its own: View (the payer's statement) for every finance
 * reader; Invoice, Collection and Edit for the finance writers.
 */
export function payerRowActions(access: FinanceAccess, handlers: PayerRowHandlers): DataTableAction<Party>[] {
  if (!access.canRead) return [];
  const view: DataTableAction<Party> = { key: 'view', header: 'View', label: 'View', href: (row) => payerStatementHref(row.id) };
  if (!access.canWrite) return [view];
  return [
    view,
    { key: 'invoice', header: 'Invoice', label: 'Invoice', onClick: handlers.invoice },
    { key: 'collection', header: 'Collection', label: 'Collection', onClick: handlers.collection },
    { key: 'edit', header: 'Edit', label: 'Edit', href: (row) => payerEditHref(row.id) },
  ];
}

/** The Due column: what the payer owes, or a dash on an API without it. */
export function payerDueText(row: Pick<Party, 'outstanding'>, format: (value: number) => string): string {
  return row.outstanding == null ? '—' : format(Number(row.outstanding));
}
