import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BudgetList } from '@/hooks/use-budgets';
import { formatCurrency } from '@/lib/utils';
import { amountIssue, budgetGridRows, budgetSaveRows, isOverspent, yearLabel } from './budget-model';
import { BudgetView } from './budget-view';
import { BudgetSetup } from './setup/budget-setup';

/**
 * EXP-22 — the Budget screen (EXP-S13) and its setup grid (EXP-S14): two
 * edited cells go in one bulk save; an overspent head's variance is
 * negative and red; a reader sees no Setup or Clone.
 */

const mocks = vi.hoisted(() => ({
  role: 'accountant',
  list: null as BudgetList | null,
  save: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('fy=fy-2026'),
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/data-table/export-strip', () => ({ ExportStrip: () => null }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: () => null }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('@/lib/auth', () => ({ getCurrentTenant: () => 't1', getUser: () => ({ societies: [{ id: 't1', name: 'Green Meadows' }] }) }));
vi.mock('@/hooks/use-ledger', () => ({
  useFinancialYears: () => ({
    data: [
      { id: 'fy-2025', label: 'FY 2025-26', start_date: '2025-04-01', end_date: '2026-03-31' },
      { id: 'fy-2026', label: 'FY 2026-27', start_date: '2026-04-01', end_date: '2027-03-31' },
    ],
  }),
}));
vi.mock('@/hooks/use-budgets', () => ({
  useBudget: () => ({ data: mocks.list, isLoading: false, error: null }),
  useSaveBudgets: () => ({ mutateAsync: mocks.save, isPending: false }),
  useCloneBudgets: () => ({ mutate: vi.fn(), isPending: false }),
}));

const head = (id: string, group: string, name: string, budget: string, booked: string) => ({
  ledger_account_id: id,
  code: id.toUpperCase(),
  account_name: name,
  group_name: group,
  budget,
  booked,
  variance: (Number(budget) - Number(booked)).toFixed(2),
});

function list(): BudgetList {
  const data = [
    head('h1', 'Indirect Expenses', 'Security', '120000.00', '30000.00'),
    head('h2', 'Indirect Expenses', 'Housekeeping', '50000.00', '62000.00'),
    head('h3', 'Repairs & Maintenance', 'Lift Repairs', '0.00', '0.00'),
  ];
  return {
    financial_year: { id: 'fy-2026', name: 'FY 2026-27', start_date: '2026-04-01', end_date: '2027-03-31', is_frozen: false },
    data,
    totals: { budget: '170000.00', booked: '92000.00', variance: '78000.00' },
  };
}

beforeEach(() => {
  mocks.role = 'accountant';
  mocks.list = list();
  mocks.save.mockReset();
  mocks.save.mockResolvedValue({ ...list(), changed: 2 });
});

describe('Budget setup grid', () => {
  it('sends one bulk save with every head when two cells are edited', async () => {
    render(<BudgetSetup />);
    expect(screen.getByText('Budget from 2026-04-01 to 2027-03-31')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Budgeted Amount, row 2'), { target: { value: '55000' } });
    fireEvent.change(screen.getByLabelText('Budgeted Amount, row 3'), { target: { value: '8000.50' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save).toHaveBeenCalledWith({
      financial_year_id: 'fy-2026',
      rows: [
        { ledger_account_id: 'h1', amount: 120000 },
        { ledger_account_id: 'h2', amount: 55000 },
        { ledger_account_id: 'h3', amount: 8000.5 },
      ],
    });
  });

  it('writes each group name once, on its first row', () => {
    render(<BudgetSetup />);
    expect(screen.getAllByText('Indirect Expenses')).toHaveLength(1);
    expect(screen.getAllByText('Repairs & Maintenance')).toHaveLength(1);
  });

  it('refuses an amount with more than two decimals, before sending', async () => {
    render(<BudgetSetup />);
    fireEvent.change(screen.getByLabelText('Budgeted Amount, row 1'), { target: { value: '10.555' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    expect(await screen.findByText('Enter an amount of 0 or more, with at most 2 decimals')).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('is read only while the year is frozen', () => {
    mocks.list = { ...list(), financial_year: { ...list().financial_year, is_frozen: true } };
    render(<BudgetSetup />);
    expect(screen.queryByRole('button', { name: /Save Changes/ })).toBeNull();
    expect(screen.getByText('This financial year is frozen; its budget cannot change.')).toBeTruthy();
  });
});

describe('Budget read view', () => {
  it('shows an overspent head’s variance negative and in red', () => {
    render(<BudgetView yearId="fy-2026" onYearChange={vi.fn()} />);

    const overspent = screen.getByText(formatCurrency(-12000));
    expect(overspent.textContent).toContain('-');
    expect(overspent.className).toContain('text-destructive');
    expect(screen.getByText(formatCurrency(90000)).className).not.toContain('text-destructive');
  });

  it('offers Setup and Clone Previous Year to a finance writer, not to an auditor', () => {
    const { unmount } = render(<BudgetView yearId="fy-2026" onYearChange={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Setup' }).getAttribute('href')).toBe('/expense-tracker/budget/setup?fy=fy-2026');
    expect(screen.getByRole('button', { name: 'Clone Previous Year' })).toBeTruthy();
    unmount();

    mocks.role = 'auditor';
    render(<BudgetView yearId="fy-2026" onYearChange={vi.fn()} />);
    expect(screen.queryByRole('link', { name: 'Setup' })).toBeNull();
  });

  it('says so when the year has no budget, and when the API has no budget yet', () => {
    mocks.list = { ...list(), data: list().data.map((row) => ({ ...row, budget: '0.00' })) };
    const { unmount } = render(<BudgetView yearId="fy-2026" onYearChange={vi.fn()} />);
    expect(screen.getByText('No budget set for this year — Setup or Clone Previous Year.')).toBeTruthy();
    unmount();

    mocks.list = null;
    render(<BudgetView yearId="" onYearChange={vi.fn()} />);
    expect(screen.getByText('The budget is not available yet.')).toBeTruthy();
  });
});

describe('budget model', () => {
  it('turns the year’s heads into grid rows and back into the save body', () => {
    const rows = budgetGridRows(list().data);
    expect(rows.map((row) => [row.values.amount, row.values.firstOfGroup])).toEqual([
      ['120000', true],
      ['50000', false],
      ['', true],
    ]);
    expect(budgetSaveRows(rows)).toEqual([
      { ledger_account_id: 'h1', amount: 120000 },
      { ledger_account_id: 'h2', amount: 50000 },
      { ledger_account_id: 'h3', amount: 0 },
    ]);
  });

  it('checks typed amounts and labels years', () => {
    expect(amountIssue('')).toBeNull();
    expect(amountIssue('1200.5')).toBeNull();
    expect(amountIssue('-1')).not.toBeNull();
    expect(amountIssue('12,000')).not.toBeNull();
    expect(isOverspent('-0.01')).toBe(true);
    expect(isOverspent('0.00')).toBe(false);
    expect(yearLabel({ start_date: '2026-04-01', end_date: '2027-03-31' })).toBe('2026 to 2027');
  });
});
