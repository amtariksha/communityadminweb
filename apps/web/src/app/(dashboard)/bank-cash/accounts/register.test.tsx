import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { BankCashAccountsPage } from './accounts-page';

// Bank & Cash › Bank & Cash Accounts › Register (BANK-08, BANK-S3).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), download: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const SOCIETY = '11111111-1111-4111-8111-111111111111';
function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', SOCIETY);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: SOCIETY, name: 'S', role }] }),
  );
}

const ACCOUNT = {
  id: 'ba-1', bank_name: 'Canara Bank', account_number: '000123456781', ifsc_code: 'CNRB0000001', account_type: 'savings', branch: 'Main',
  opening_balance: 0, current_balance: 11500, book_balance: 11500, bank_balance: 12000, is_primary: true, is_active: true,
};
const line = (id: string, date: string, deposit: string, withdrawal: string, balance: string, extra = {}) => ({
  id, journal_entry_id: `je-${id}`, entry_date: date, entry_number: 1, document_no: `RCP-${id}`, particulars: 'Maintenance — A-101',
  instrument_no: null, deposit, withdrawal, balance, bank_date: null, is_reconciled: false, is_reversed: false, ...extra,
});
const REGISTER = {
  bank_account: { id: 'ba-1', account_name: null, bank_name: 'Canara Bank', account_number: '000123456781' },
  from: '2026-10-01', to: '2026-10-31', opening_balance: '10000.00', closing_balance: '11500.00', book_balance: 11500, bank_balance: 12000,
  rows: [line('l1', '2026-10-05', '2000.00', '0.00', '12000.00'), line('l2', '2026-10-06', '0.00', '500.00', '11500.00', { bank_date: '2026-10-07', is_reconciled: true })],
};

const get = vi.mocked(api.get);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T06:00:00Z'));
  signIn('accountant');
  get.mockImplementation(async (path: string) => {
    if (path === '/bank/accounts') return { data: [ACCOUNT] };
    if (path.startsWith('/bank/register/')) return { data: REGISTER };
    return { data: [], total: 0 };
  });
  vi.mocked(api.post).mockResolvedValue({ data: { id: 'l1', is_reconciled: true } });
});
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BankCashAccountsPage />
    </QueryClientProvider>,
  );
}

const registerCalls = () => get.mock.calls.filter(([path]) => String(path).startsWith('/bank/register/'));

describe('bank register', () => {
  it('shows Book and Bank on each account tile', async () => {
    renderPage();
    const tile = await screen.findByRole('listitem');
    expect(within(tile).getByText('Canara Bank (6781)')).toBeTruthy();
    expect(within(tile).getByText('₹11,500')).toBeTruthy();
    expect(within(tile).getByText('₹12,000')).toBeTruthy();
  });

  it('stays empty until an account is chosen and Fetch Transactions pressed', async () => {
    renderPage();
    await screen.findByRole('listitem');
    expect(screen.getByText('Choose an account and period, then Fetch Transactions.')).toBeTruthy();
    expect((screen.getByLabelText('Txns Posted from') as HTMLInputElement).value).toBe('2026-10-01');
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
    expect(screen.getByRole('alert').textContent).toBe('Choose an account.');
    expect(registerCalls()).toHaveLength(0);
  });

  it('lists the period with the running balance and reconciles a line', async () => {
    renderPage();
    await screen.findByRole('listitem');
    fireEvent.change(screen.getByLabelText('Account'), { target: { value: 'ba-1' } });
    fireEvent.click(screen.getByLabelText('All Transactions'));
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));

    const table = screen.getByRole('table', { name: 'Bank Register' });
    await within(table).findByText('RCP-l1');
    expect(registerCalls()[0]).toEqual(['/bank/register/ba-1', { params: { from: '2026-10-01', to: '2026-10-31', scope: 'all' } }]);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('₹12,000');
    expect(rows[1].textContent).toContain('₹11,500');
    expect(within(rows[1]).getByRole('button', { name: 'Undo' })).toBeTruthy();
    expect(screen.getByText(/Opening balance ₹10,000 · Closing balance ₹11,500/)).toBeTruthy();

    fireEvent.change(within(rows[0]).getByLabelText('Bank date for RCP-l1'), { target: { value: '2026-10-08' } });
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Reconcile' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/bank/reconciliation/l1/reconcile', { bank_date: '2026-10-08' }));
  });

  it('gives a committee member the register without Reconcile', async () => {
    signIn('committee_member');
    renderPage();
    await screen.findByRole('listitem');
    fireEvent.change(screen.getByLabelText('Account'), { target: { value: 'ba-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
    const table = screen.getByRole('table', { name: 'Bank Register' });
    await within(table).findByText('RCP-l1');
    expect(within(table).queryByRole('button', { name: 'Reconcile' })).toBeNull();
    expect(within(table).queryByRole('button', { name: 'Undo' })).toBeNull();
  });
});

describe('bank register scope and search (BANK-09)', () => {
  it('fetches Non reconciled by default and searches the period by amount', async () => {
    renderPage();
    await screen.findByRole('listitem');
    fireEvent.change(screen.getByLabelText('Account'), { target: { value: 'ba-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
    const table = screen.getByRole('table', { name: 'Bank Register' });
    await within(table).findByText('RCP-l1');
    expect(within(table).queryByText('RCP-l2')).toBeNull();
    expect(registerCalls()[0][1]).toEqual({ params: { from: '2026-10-01', to: '2026-10-31', scope: 'unreconciled' } });

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: '500' } });
    fireEvent.click(screen.getByLabelText('Amount'));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(registerCalls().at(-1)?.[1]).toEqual({ params: { from: '2026-10-01', to: '2026-10-31', scope: 'unreconciled', q: '500', search_in: 'amount' } }));
    expect(await within(table).findByText('No transactions match.')).toBeTruthy();
  });
});
