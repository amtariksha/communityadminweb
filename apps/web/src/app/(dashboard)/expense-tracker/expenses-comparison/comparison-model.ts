import type { IncomeExpenditureRow } from '@/hooks/use-ledger';

/**
 * Expenses Comparison (EXP-25, screen EXP-S15) as plain data: the expense
 * side of the Income & Expenditure, heads with spend biggest first, each
 * with its share of the total, and the pie's slices (the ten biggest heads
 * and "Others"). Shares are rounded the way the API's export rounds them
 * (`modules/budget/expense-comparison.ts`): two decimals, the largest
 * remainders rounded up, so the column adds up to exactly 100.
 */

export interface ComparisonRow {
  account_id: string;
  group_name: string;
  account_name: string;
  amount: number;
  percent: number;
}

export interface PieSlice {
  name: string;
  value: number;
}

export const PIE_HEADS = 10;
export const OTHERS = 'Others';

const toPaise = (value: number | string): number => Math.round(Number(value) * 100);

/** Hundredths of a percent per row, adding up to 10,000. */
function shares(paise: readonly number[]): number[] {
  const total = paise.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return paise.map(() => 0);
  const exact = paise.map((value) => (value * 10_000) / total);
  const result = exact.map(Math.floor);
  const short = 10_000 - result.reduce((sum, value) => sum + value, 0);
  exact
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest)
    .slice(0, short)
    .forEach(({ index }) => {
      result[index] += 1;
    });
  return result;
}

export function comparisonRows(expense: readonly IncomeExpenditureRow[]): ComparisonRow[] {
  const spent = expense
    .map((row) => ({ row, paise: toPaise(row.amount) }))
    .filter(({ paise }) => paise > 0)
    .sort((a, b) => b.paise - a.paise || a.row.account_name.localeCompare(b.row.account_name));
  const percents = shares(spent.map(({ paise }) => paise));
  return spent.map(({ row, paise }, index) => ({
    account_id: row.account_id,
    group_name: row.group_name ?? '',
    account_name: row.account_name,
    amount: paise / 100,
    percent: percents[index] / 100,
  }));
}

/** The ten biggest heads, then one "Others" slice for the rest (when there is a rest). */
export function pieSlices(rows: readonly ComparisonRow[]): PieSlice[] {
  const top = rows.slice(0, PIE_HEADS).map((row) => ({ name: row.account_name, value: row.amount }));
  const restPaise = rows.slice(PIE_HEADS).reduce((sum, row) => sum + toPaise(row.amount), 0);
  return restPaise > 0 ? [...top, { name: OTHERS, value: restPaise / 100 }] : top;
}
