import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import DashboardContent from './dashboard-content';

/**
 * DASH-01 — three figures on the standard dashboard read keys the API never
 * sends: Total Expenses (`total_expenditure`), the expense bars (a same-account
 * pairing that cannot match) and the defaulter count (`res.total`).
 */

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() }, API_BASE_URL: 'http://api.test' }));

vi.mock('recharts', () => {
  const Nothing = (): null => null;
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    BarChart: ({ data }: { data: unknown[] }) => (
      <div data-testid="income-expense-chart" data-points={JSON.stringify(data)} />
    ),
    Bar: Nothing,
    XAxis: Nothing,
    YAxis: Nothing,
    CartesianGrid: Nothing,
    Tooltip: Nothing,
    Legend: Nothing,
  };
});

const get = vi.mocked(api.get);

// Wednesday 17 Oct 2026 in India. The six months shown are May to October.
const NOW = new Date('2026-10-17T10:00:00+05:30');

const MONTHLY_REPORTS: Record<string, { total_income: number; total_expense: string }> = {
  '2026-05': { total_income: 10000, total_expense: '3000.00' },
};

const DEFAULTER_ROWS = ['A-101', 'A-102', 'B-201', 'B-202'].map((unit) => ({
  unit_id: unit,
  unit_number: unit,
  total_due: '1250.50',
}));

function incomeExpenditure(params: Record<string, string>): { data: unknown } {
  const isFinancialYear = params.start_date.endsWith('-04-01') && params.end_date.endsWith('-03-31');
  if (isFinancialYear) {
    return { data: { income: [], expense: [], total_income: 25000, total_expense: '3000.00', surplus: 22000 } };
  }
  const totals = MONTHLY_REPORTS[params.start_date.slice(0, 7)] ?? { total_income: 0, total_expense: 0 };
  return { data: { income: [], expense: [], surplus: 0, ...totals } };
}

function respond(url: string, options?: { params?: Record<string, string> }): Promise<unknown> {
  switch (url) {
    case '/ledger/reports/income-expenditure':
      return Promise.resolve(incomeExpenditure(options?.params ?? {}));
    case '/invoices/defaulters':
      return Promise.resolve({ data: DEFAULTER_ROWS });
    case '/receipts/summary':
      return Promise.resolve({ data: [{ month: '2026-09', mode: 'upi', count: 3, total: 5000 }] });
    default:
      return Promise.resolve({ data: [] });
  }
}

function renderDashboard(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <DashboardContent />
    </QueryClientProvider>,
  );
}

function cardOf(title: string): HTMLElement {
  return screen.getByText(title).closest('.rounded-lg') as HTMLElement;
}

function chartPoints(): Array<{ label: string; income: number; expense: number }> {
  const chart = screen.getByTestId('income-expense-chart');
  return JSON.parse(chart.getAttribute('data-points') ?? '[]');
}

describe('standard dashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    get.mockImplementation(respond as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows the total expense the income and expenditure report sends', async () => {
    renderDashboard();

    await waitFor(() => expect(cardOf('Total Expenses').textContent).toContain('₹3,000'));
  });

  it('counts the defaulters the API lists', async () => {
    renderDashboard();

    await waitFor(() => expect(cardOf('Outstanding Dues').textContent).toContain('4 defaulters →'));
    expect(cardOf('Outstanding Dues').textContent).toContain('₹5,002');
  });

  it('charts income and expense together for each of the last six months', async () => {
    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('income-expense-chart')).toBeTruthy());
    const points = chartPoints();

    expect(points.map((point) => point.label)).toEqual(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
    expect(points[0]).toMatchObject({ income: 10000, expense: 3000 });
    expect(points.filter((point) => point.expense > 0)).toHaveLength(1);
  });

  it('asks the report once per month, for that month only', async () => {
    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('income-expense-chart')).toBeTruthy());
    const monthly = get.mock.calls
      .filter(([url]) => url === '/ledger/reports/income-expenditure')
      .map(([, options]) => (options as { params: Record<string, string> }).params)
      .filter((params) => params.start_date.slice(0, 7) === params.end_date.slice(0, 7));

    expect(monthly).toHaveLength(6);
    expect(monthly[0]).toEqual({ start_date: '2026-05-01', end_date: '2026-05-31' });
    expect(monthly[5]).toEqual({ start_date: '2026-10-01', end_date: '2026-10-31' });
  });
});
