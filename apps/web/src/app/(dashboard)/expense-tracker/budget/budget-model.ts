import type { SavedGridRow } from '@/components/editable-grid';
import type { BudgetRow } from '@/hooks/use-budgets';

/**
 * The Budget screens (EXP-S13 / S14) as plain data: grid rows, what the
 * one Save Changes sends, and how a figure is shown. The server stores and
 * recomputes every figure; nothing here does money arithmetic beyond
 * reading what was typed.
 */

export interface BudgetGridValues {
  groupName: string;
  accountName: string;
  code: string;
  /** As typed, e.g. "120000" or "1500.50". */
  amount: string;
  /** Whether this row starts its group (the group name spans the group's rows). */
  firstOfGroup: boolean;
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Shown in the cell: "120000.00" → "120000", "1500.50" stays. */
function typedAmount(value: string): string {
  return Number(value) === 0 ? '' : String(Number(value));
}

export function budgetGridRows(rows: readonly BudgetRow[]): SavedGridRow<BudgetGridValues>[] {
  return rows.map((row, index) => ({
    id: row.ledger_account_id,
    values: {
      groupName: row.group_name,
      accountName: row.account_name,
      code: row.code ?? '',
      amount: typedAmount(row.budget),
      firstOfGroup: index === 0 || rows[index - 1].group_name !== row.group_name,
    },
  }));
}

/** The message for a typed amount the server would refuse, else null. Blank = 0. */
export function amountIssue(amount: string): string | null {
  const text = amount.trim();
  if (text === '') return null;
  return AMOUNT_PATTERN.test(text) ? null : 'Enter an amount of 0 or more, with at most 2 decimals';
}

/** The body of PUT /budgets/bulk: every head of the grid (the server writes only what changed). */
export function budgetSaveRows(
  rows: ReadonlyArray<{ id?: string; values: BudgetGridValues }>,
): Array<{ ledger_account_id: string; amount: number }> {
  return rows.flatMap((row) =>
    row.id ? [{ ledger_account_id: row.id, amount: Math.round(Number(row.values.amount.trim() || '0') * 100) / 100 }] : [],
  );
}

/** Overspent (negative variance) is shown in red. */
export function isOverspent(variance: string): boolean {
  return Number(variance) < 0;
}

/** "2026-04-01" → "2026": a year shown "<start year> to <end year>". */
export function yearLabel(year: { start_date: string | Date; end_date: string | Date }): string {
  const text = (value: string | Date): string => (typeof value === 'string' ? value : value.toISOString()).slice(0, 4);
  return `${text(year.start_date)} to ${text(year.end_date)}`;
}
