import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { IncomeExpenditureView } from './income-expenditure-view';

/**
 * GL-04 — the report API sends `expense`, `total_expense`, `surplus`,
 * `start_date` and `end_date`. The view used to read `expenditure`,
 * `total_expenditure` and `surplus_or_deficit`, so the expenditure side was
 * empty and the surplus read zero.
 */

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));

const exportProps = vi.hoisted(() => ({ latest: null as null | { filename: string; data: unknown[] } }));

vi.mock('@/components/ui/export-button', () => ({
  ExportButton: (props: { filename: string; data: unknown[] }) => {
    exportProps.latest = props;
    return <button type="button">Export</button>;
  },
}));

const get = vi.mocked(api.get);

const REPORT = {
  income: [
    { account_id: 'a-1', account_name: 'Maintenance Income', account_code: 'maintenance_income', type: 'income', amount: 10000 },
  ],
  expense: [
    { account_id: 'a-2', account_name: 'Repair Expense', account_code: 'repair_expense', type: 'expense', amount: 3000 },
  ],
  total_income: 10000,
  total_expense: 3000,
  surplus: 7000,
  start_date: '2026-04-01',
  end_date: '2026-04-30',
};

function renderView(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <IncomeExpenditureView startDate="2026-04-01" endDate="2026-04-30" />
    </QueryClientProvider>,
  );
}

function tableUnder(heading: string): HTMLElement {
  return screen.getByRole('heading', { name: heading }).parentElement as HTMLElement;
}

describe('IncomeExpenditureView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exportProps.latest = null;
    get.mockResolvedValue({ data: REPORT });
  });

  it('lists the expense accounts and totals them', async () => {
    renderView();

    const expenditure = await waitFor(() => tableUnder('Expenditure'));
    await waitFor(() => expect(within(expenditure).getByText('Repair Expense')).toBeTruthy());
    const totalRow = within(expenditure).getByText('Total Expenditure').closest('tr') as HTMLElement;
    expect(within(totalRow).getByText('₹3,000')).toBeTruthy();
  });

  it('shows the surplus the API computed', async () => {
    renderView();

    await screen.findByText('Surplus');
    expect(screen.getByText('₹7,000')).toBeTruthy();
    expect(screen.queryByText('Deficit')).toBeNull();
  });

  it('shows a deficit when expense exceeds income', async () => {
    get.mockResolvedValue({ data: { ...REPORT, total_expense: 12000, surplus: -2000 } });
    renderView();

    await screen.findByText('Deficit');
    expect(screen.getByText('₹2,000')).toBeTruthy();
  });

  it('names the export after the report period', async () => {
    renderView();

    await screen.findByText('Repair Expense');
    expect(exportProps.latest?.filename).toBe('income-expenditure-2026-04-01-to-2026-04-30');
    expect(exportProps.latest?.data).toHaveLength(2);
  });
});
