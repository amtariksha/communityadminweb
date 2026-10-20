import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { TrialBalanceOptions } from '@/components/ledger-reports/trial-balance-options';

// General Ledger › Trial Balance options (GL-15, screen GL-S13).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));
vi.mock('@/components/ledger-reports/trial-balance-view', () => ({ TrialBalanceView: ({ asOfDate }: { asOfDate: string }) => <p>{`One-date view ${asOfDate}`}</p> }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const line = (id: string, code: string, name: string, group: string, type: string, opening: number, debit: number, credit: number) => ({
  account_id: id, account_code: code, account_name: name, group_name: group, type, opening_balance: opening, debit, credit, closing_balance: opening + debit - credit,
});
const REPORT = {
  mode: 'period',
  from_date: '2026-05-01',
  to_date: '2026-05-31',
  rows: [line('a1', 'bank', 'Bank Account', 'Bank Accounts', 'asset', 1000, 200, 0), line('i1', 'other_income', 'Other Income', 'Indirect Incomes', 'income', 0, 0, 200)],
  totals: { opening_debit: 1000, opening_credit: 0, debit: 200, credit: 200, closing_debit: 1200, closing_credit: 200 },
  out_of_balance: 0,
};

const get = vi.mocked(api.get);
beforeEach(() => get.mockResolvedValue({ data: REPORT }));
afterEach(() => vi.clearAllMocks());

function renderForm() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TrialBalanceOptions />
    </QueryClientProvider>,
  );
}

describe('Trial balance options', () => {
  it('needs From for a period and sends the options', async () => {
    renderForm();
    expect((screen.getByLabelText('From') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Period Trial Balance'));
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-05-31' } });
    expect((screen.getByRole('button', { name: 'Generate Trial balance' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-05-01' } });
    fireEvent.click(screen.getByLabelText('Suppress Retained Earnings Transactions'));
    fireEvent.click(screen.getByRole('button', { name: 'Generate Trial balance' }));

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(get).toHaveBeenCalledWith('/ledger/reports/trial-balance', {
      params: { as_of_date: '2026-05-31', to_date: '2026-05-31', mode: 'period', from_date: '2026-05-01', suppress_retained_earnings: 'true' },
    });
  });

  it('shows opening, movement and closing with Dr / Cr, by type and group, linking each account to the query', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Generate Trial balance' }));
    const table = await screen.findByRole('table', { name: 'Trial balance' });
    expect(within(table).getByText('Assets')).toBeTruthy();
    expect(within(table).getByText('Total Bank Accounts')).toBeTruthy();
    const bank = within(table).getByText('Bank Account').closest('tr') as HTMLElement;
    expect(bank.textContent).toContain('₹1,000 Dr');
    expect(bank.textContent).toContain('₹1,200 Dr');
    expect(within(table).getByText('Bank Account').getAttribute('href')).toBe('/general-ledger/query/by-group?account_id=a1&to=2026-05-31&from=2026-05-01');
    expect(screen.queryByText(/Out of balance/)).toBeNull();
  });

  it('says so when the books are out of balance', async () => {
    get.mockResolvedValue({ data: { ...REPORT, out_of_balance: 50 } });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Generate Trial balance' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Out of balance by');
  });

  it('falls back to the one-date view on an older API', async () => {
    get.mockResolvedValue({ data: [] });
    renderForm();
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-05-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Trial balance' }));
    expect(await screen.findByText('One-date view 2026-05-31')).toBeTruthy();
  });
});
