import type { DataTableAction } from '@/components/data-table';
import { api } from '@/lib/api';
import { saveBlob } from '@/lib/download';
import type { UnitDuesRow } from '@/hooks/use-unit-ledger';
import type { FinanceAccess } from '@/lib/finance-roles';

export const MEMBER_INCOME_BASE = '/income/members';

/** Utility Income's rows open the same screens under its own route (UTIL-08). */
export const UTILITY_INCOME_BASE = '/utilities/income';

export const statementHref = (unitId: string, base = MEMBER_INCOME_BASE): string => `${base}/${unitId}/statement`;
export const invoiceHref = (unitId: string, base = MEMBER_INCOME_BASE): string => `${base}/${unitId}/invoice`;
export const collectionHref = (unitId: string, billId?: string, base = MEMBER_INCOME_BASE): string =>
  `${base}/${unitId}/collection${billId ? `?bill=${billId}` : ''}`;
/** INC-48 — Member Income › Unidentified Collection. */
export const UNIDENTIFIED_HREF = `${MEMBER_INCOME_BASE}/unidentified`;
// INC-64 / INC-65 — received post-dated cheques and the paid-intimation queue.
export const CHEQUES_HREF = `${MEMBER_INCOME_BASE}/cheques`;
export const INTIMATIONS_HREF = `${MEMBER_INCOME_BASE}/intimations`;
/** INC-47 — Post a Refundable Deposit for the unit. */
export const depositHref = (unitId: string): string => `${MEMBER_INCOME_BASE}/${unitId}/deposit`;

/** "Post and Print Receipt": the receipt PDF (GET /receipts/:id/pdf). */
export async function printReceipt(receiptId: string, receiptNumber: string): Promise<void> {
  const blob = await api.download(`/receipts/${receiptId}/pdf`);
  saveBlob(blob, `receipt-${receiptNumber}.pdf`);
}

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
  /** Post Collection: likewise. */
  collection: (row: UnitDuesRow) => void;
}

/**
 * The row buttons of Member Income (INC-S16), each in a column of its own:
 * Account History (View) and Print for every finance reader; Post Invoice
 * and Post Collection, for the finance writers, as their screens ship.
 */
export function memberRowActions(
  access: FinanceAccess,
  handlers: MemberRowHandlers,
  base = MEMBER_INCOME_BASE,
): DataTableAction<UnitDuesRow>[] {
  if (!access.canRead) return [];
  const history: DataTableAction<UnitDuesRow> = {
    key: 'history',
    header: 'Account History',
    label: 'View',
    href: (row) => statementHref(row.unit_id, base),
  };
  const print: DataTableAction<UnitDuesRow> = { key: 'print', header: 'Print', label: 'Print', onClick: handlers.print };
  if (!access.canWrite) return [history, print];
  return [
    history,
    { key: 'invoice', header: 'Post Invoice', label: 'Invoice', onClick: handlers.invoice },
    { key: 'collection', header: 'Post Collection', label: 'Collection', onClick: handlers.collection },
    print,
  ];
}
