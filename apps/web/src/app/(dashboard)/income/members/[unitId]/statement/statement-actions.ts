import type { StatementAction, StatementRow, UnitStatement } from '@/hooks/use-unit-statement';
import type { FinanceAccess } from '@/lib/finance-roles';

export type StatementTab = 'due' | 'advances' | 'deposit' | 'admin' | 'user';

export const STATEMENT_TABS: readonly StatementTab[] = ['due', 'advances', 'deposit', 'admin', 'user'];

/** A payer holds no advance or deposit (INC-46): its statement has these tabs. */
export const PAYER_STATEMENT_TABS: readonly StatementTab[] = ['due', 'admin', 'user'];

export function tabFrom(value: string | null, tabs: readonly StatementTab[] = STATEMENT_TABS): StatementTab {
  return tabs.includes(value as StatementTab) ? (value as StatementTab) : 'admin';
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

/** "A-101" for a unit, the payer's name for a payer (INC-46). */
export function statementName(statement: Pick<UnitStatement, 'unit' | 'payer'>): string {
  return statement.payer?.name ?? unitLabel(statement.unit);
}

const ddmmyyyy = (iso: string): string => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;

/** Send Email's subject to start from (the server's default too): "Account Statement for A-101 – 01-04-2026 to 20-10-2026". */
export function statementEmailSubject(statement: Pick<UnitStatement, 'unit' | 'payer' | 'from' | 'to'>): string {
  return `Account Statement for ${statementName(statement)} – ${ddmmyyyy(statement.from)} to ${ddmmyyyy(statement.to)}`.slice(0, 255);
}
