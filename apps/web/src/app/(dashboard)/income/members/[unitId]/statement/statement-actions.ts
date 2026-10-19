import type { StatementAction, StatementRow } from '@/hooks/use-unit-statement';
import type { FinanceAccess } from '@/lib/finance-roles';

export type StatementTab = 'due' | 'advances' | 'deposit' | 'admin' | 'user';

export const STATEMENT_TABS: readonly StatementTab[] = ['due', 'advances', 'deposit', 'admin', 'user'];

export function tabFrom(value: string | null): StatementTab {
  return STATEMENT_TABS.includes(value as StatementTab) ? (value as StatementTab) : 'admin';
}

export interface RowMenuItem {
  action: StatementAction;
  label: string;
}

const LABELS: Record<StatementAction, string> = {
  reverse: 'Reverse',
  edit: 'Edit',
  view_allocation: 'View Allocation',
};

/**
 * The Actions menu of one statement row: what the server offers on it,
 * less what this user may not do. Reverse and Edit post; View Allocation
 * only reads.
 */
export function rowMenu(row: StatementRow, access: FinanceAccess): RowMenuItem[] {
  return row.actions
    .filter((action) => (action === 'view_allocation' ? access.canRead : access.canWrite))
    .map((action) => ({ action, label: LABELS[action] }));
}

/** What Reverse does on a row: cancel the invoice, void the receipt, or waive the interest. */
export type ReverseKind = 'cancel_invoice' | 'void_receipt' | 'waive_interest';

export function reverseKind(row: StatementRow): ReverseKind | null {
  if (row.doc_type === 'invoice' || row.doc_type === 'debit_note') return 'cancel_invoice';
  if (row.doc_type === 'receipt') return 'void_receipt';
  if (row.doc_type === 'interest') return 'waive_interest';
  return null;
}

/** The document a row's allocation view is about. */
export function allocationTarget(row: StatementRow): { docType: 'invoice' | 'receipt' | 'credit_note'; docId: string } | null {
  if (row.doc_type === 'receipt') return { docType: 'receipt', docId: row.doc_id };
  if (row.doc_type === 'credit_note') return { docType: 'credit_note', docId: row.doc_id };
  if ((row.doc_type === 'invoice' || row.doc_type === 'debit_note') && row.invoice_id) {
    return { docType: 'invoice', docId: row.invoice_id };
  }
  return null;
}

/** "Export rows 1–n" (n counts the opening, document and closing rows). */
export function exportLabel(documentRows: number): string {
  return `Export rows 1–${documentRows + 3}`;
}

export function unitLabel(unit: { unit_number: string; block: string | null }): string {
  return unit.block ? `${unit.block}-${unit.unit_number}` : unit.unit_number;
}
