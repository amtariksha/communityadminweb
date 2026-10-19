import type { DataTableAction } from '@/components/data-table';
import type { UnitDuesRow } from '@/hooks/use-unit-ledger';
import type { FinanceAccess } from '@/lib/finance-roles';

export const MEMBER_INCOME_BASE = '/income/members';

export const statementHref = (unitId: string): string => `${MEMBER_INCOME_BASE}/${unitId}/statement`;
export const invoiceHref = (unitId: string): string => `${MEMBER_INCOME_BASE}/${unitId}/invoice`;

/** Other postings from the Post Invoice form (INC-S18's button column), as they ship. */
export function invoiceMoreActions(unitId: string): Array<{ label: string; href: string }> {
  const creditNote = `${MEMBER_INCOME_BASE}/${unitId}/credit-note`;
  return [
    { label: 'Post a General Credit Note', href: `${creditNote}?kind=general` },
    { label: 'Post an Account Specific Credit Note', href: `${creditNote}?kind=account` },
    { label: 'Post Specific Credit Note', href: `${creditNote}?kind=specific` },
    { label: 'Post Multi-Line Invoice', href: `${invoiceHref(unitId)}/multi-line` },
    { label: 'Post Multi-Line GST Invoice', href: `${invoiceHref(unitId)}/multi-line-gst` },
  ];
}

export interface MemberRowHandlers {
  /** Print: the unit's statement PDF, current financial year to date. */
  print: (row: UnitDuesRow) => void;
  /** Post Invoice: the form as a page (classic) or a dialog (standard). */
  invoice: (row: UnitDuesRow) => void;
}

/**
 * The row buttons of Member Income (INC-S16), each in a column of its own:
 * Account History (View) and Print for every finance reader; Post Invoice
 * and Post Collection, for the finance writers, as their screens ship.
 */
export function memberRowActions(access: FinanceAccess, handlers: MemberRowHandlers): DataTableAction<UnitDuesRow>[] {
  if (!access.canRead) return [];
  const history: DataTableAction<UnitDuesRow> = {
    key: 'history',
    header: 'Account History',
    label: 'View',
    href: (row) => statementHref(row.unit_id),
  };
  const print: DataTableAction<UnitDuesRow> = { key: 'print', header: 'Print', label: 'Print', onClick: handlers.print };
  if (!access.canWrite) return [history, print];
  return [history, { key: 'invoice', header: 'Post Invoice', label: 'Invoice', onClick: handlers.invoice }, print];
}
