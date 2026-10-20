import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { FinancialStatementsPage } from './financial-statements/financial-statements-page';

// General Ledger › Financial Statements (GL-16, screen GL-S14).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));
vi.mock('@/hooks', () => ({
  useFinancialYears: () => ({
    data: [
      { id: 'fy-26', label: 'FY 2026-27', start_date: '2026-04-01', end_date: '2027-03-31', is_current: true, is_frozen: false },
      { id: 'fy-25', label: 'FY 2025-26', start_date: '2025-04-01', end_date: '2026-03-31', is_current: false, is_frozen: true },
    ],
  }),
}));
vi.mock('@/components/ledger-reports/balance-sheet-view', () => ({ BalanceSheetView: ({ asOfDate }: { asOfDate: string }) => <p>{`Old BS ${asOfDate}`}</p> }));
vi.mock('@/components/ledger-reports/income-expenditure-view', () => ({ IncomeExpenditureView: () => <p>Old I&amp;E</p> }));

const STATEMENTS = {
  basis: 'period',
  from_date: '2026-04-01',
  to_date: '2027-03-31',
  balance_sheet: {
    assets: [{ group_name: 'Bank Accounts', accounts: [{ account_id: 'a', account_name: 'Bank Account', account_code: 'bank', balance: 57000 }], total: 57000 }],
    liabilities: [],
    equity: [{ group_name: 'Equity', accounts: [{ account_id: 'r', account_name: 'Retained Earnings (Opening)', account_code: 're_opening', balance: 50000 }], total: 50000 }],
    total_assets: 57000, total_liabilities: 0, total_equity: 50000, unclosed_surplus: 7000, total_liabilities_and_equity: 57000,
  },
  income_expenditure: {
    income: [{ account_id: 'i', account_name: 'Maintenance Income', account_code: 'mi', group_name: 'Indirect Incomes', amount: 10000 }],
    expense: [{ account_id: 'e', account_name: 'Repair Expense', account_code: 're', group_name: 'Indirect Expenses', amount: 3000 }],
    total_income: 10000, total_expense: 3000, surplus: 7000,
  },
};

const get = vi.mocked(api.get);
beforeEach(() => get.mockResolvedValue({ data: STATEMENTS }));
afterEach(() => vi.clearAllMocks());

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FinancialStatementsPage />
    </QueryClientProvider>,
  );
}

describe('Financial Statements', () => {
  it('by period sends the year and the suppress switches (retained earnings on by default)', async () => {
    renderPage();
    const period = screen.getByLabelText('Period') as HTMLSelectElement;
    expect([...period.options].map((option) => option.textContent)).toEqual(['March 2027', 'March 2026']);
    fireEvent.change(period, { target: { value: 'fy-25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Reports' }));
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(get).toHaveBeenCalledWith('/ledger/reports/financial-statements', {
      params: { basis: 'period', fy_id: 'fy-25', suppress_retained_earnings: 'true', suppress_opening_balance: 'false' },
    });
  });

  it('horizontal: Liabilities & Equity beside Assets with equal totals and the unclosed surplus line', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Generate Reports' }));
    const sheet = await screen.findByRole('region', { name: /Balance Sheet/ });
    expect(within(sheet).getByText(/not yet closed/)).toBeTruthy();
    expect(within(sheet).getByText('Total Liabilities & Equity').nextSibling?.textContent).toBe('₹57,000');
    expect(within(sheet).getByText('Total Assets').nextSibling?.textContent).toBe('₹57,000');
    const ie = screen.getByRole('region', { name: /Income & Expenditure/ });
    expect(within(ie).getByText(/Surplus \(excess of income/)).toBeTruthy();
    expect(within(ie).getByText('Total Expenditure').nextSibling?.textContent).toBe('₹10,000');
  });

  it('vertical: one column, Assets first, Income before Expenditure', async () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Vertical Format'));
    fireEvent.click(screen.getByRole('button', { name: 'Generate Reports' }));
    const sheet = await screen.findByRole('region', { name: /Balance Sheet/ });
    const headings = within(sheet).getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent);
    expect(headings).toEqual(['Assets', 'Liabilities & Equity']);
    const ie = screen.getByRole('region', { name: /Income & Expenditure/ });
    expect(within(ie).getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent)).toEqual(['Income', 'Expenditure']);
  });

  it('by date refuses From after To', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('By Date'));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2027-01-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-12-31' } });
    expect((screen.getByRole('button', { name: 'Generate Reports' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
