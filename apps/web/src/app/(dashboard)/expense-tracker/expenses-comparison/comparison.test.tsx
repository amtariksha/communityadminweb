import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ExpensesComparisonContent } from './comparison-content';
import { comparisonRows, OTHERS, pieSlices } from './comparison-model';

/**
 * EXP-25 — Expenses Comparison (EXP-S15): opens empty, and after Fetch a
 * pie of the ten biggest heads plus "Others" above a table of every head
 * whose shares add up to 100.
 */

const mocks = vi.hoisted(() => ({ calls: [] as Array<[string, string]> }));

const TWELVE = Array.from({ length: 12 }, (_, index) => ({
  account_id: `h${index + 1}`,
  account_name: `Head ${String(index + 1).padStart(2, '0')}`,
  account_code: `E${index + 1}`,
  group_name: index % 2 ? 'Repairs & Maintenance' : 'Indirect Expenses',
  amount: 1000 * (index + 1) + 7,
}));

vi.mock('@/components/data-table/export-strip', () => ({ ExportStrip: () => null }));
vi.mock('@/hooks/use-ledger', () => ({
  useIncomeExpenditure: (from: string, to: string) => {
    mocks.calls.push([from, to]);
    const fetched = from !== '' && to !== '';
    return { data: fetched ? { expense: TWELVE } : undefined, isLoading: false, isFetching: false, error: null };
  },
}));
vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    ResponsiveContainer: Pass,
    PieChart: Pass,
    Pie: Pass,
    Cell: ({ fill }: { fill: string }) => <span data-testid="pie-slice" data-fill={fill} />,
    Tooltip: () => null,
    Legend: () => null,
  };
});

describe('comparison model', () => {
  it('puts ten slices and "Others" in the pie when twelve heads have spend', () => {
    const rows = comparisonRows(TWELVE);
    const slices = pieSlices(rows);

    expect(slices).toHaveLength(11);
    expect(slices[0].name).toBe('Head 12');
    expect(slices[10]).toEqual({ name: OTHERS, value: rows[10].amount + rows[11].amount });
    expect(Math.round(rows.reduce((sum, row) => sum + row.percent, 0) * 100)).toBe(10_000);
  });

  it('has no "Others" slice for ten heads or fewer, and leaves out heads without spend', () => {
    expect(pieSlices(comparisonRows(TWELVE.slice(0, 10))).map((slice) => slice.name)).not.toContain(OTHERS);
    expect(comparisonRows([{ account_id: 'x', account_name: 'Refund', account_code: 'E9', amount: -10 }])).toEqual([]);
  });
});

describe('Expenses Comparison page', () => {
  it('opens empty, then shows the pie and every head with its share', () => {
    render(<ExpensesComparisonContent />);
    expect(screen.queryAllByTestId('pie-slice')).toHaveLength(0);
    expect(screen.getByText('Choose what to show above and press Fetch.')).toBeTruthy();

    const [from, to] = screen.getAllByLabelText(/^Date (from|to)$/);
    fireEvent.change(from, { target: { value: '2026-04-01' } });
    fireEvent.change(to, { target: { value: '2026-09-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));

    expect(mocks.calls.at(-1)).toEqual(['2026-04-01', '2026-09-30']);
    expect(screen.getAllByTestId('pie-slice')).toHaveLength(11);
    const table = screen.getByRole('table', { name: 'Expense Comparison' });
    const bodyRows = within(table).getAllByRole('row').slice(1, -1);
    expect(bodyRows).toHaveLength(12);
    const percents = bodyRows.map((row) => Number(within(row).getAllByRole('cell').at(-1)?.textContent?.replace('%', '')));
    expect(Math.round(percents.reduce((sum, value) => sum + value, 0) * 100)).toBe(10_000);
    expect(within(table).getAllByText('Indirect Expenses').length).toBeGreaterThan(0);
  });

  it('refuses to fetch without both dates', () => {
    render(<ExpensesComparisonContent />);
    const before = mocks.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
    expect(screen.getByText('Choose a from and a to date.')).toBeTruthy();
    expect(mocks.calls.slice(before).every(([from]) => from === '')).toBe(true);
  });
});
