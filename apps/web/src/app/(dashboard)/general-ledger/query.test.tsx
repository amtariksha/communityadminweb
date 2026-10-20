import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { QueryByAccountPage } from './query/by-group/query-by-account-page';
import { QueryByUserPage } from './query/by-user/query-by-user-page';

// General Ledger › Query by account group and by user (GL-17).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));
const search = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => search.params }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/hooks', () => ({
  useAccountGroups: () => ({
    data: [
      { id: 'g-ie', code: 'EXP.IND', name: 'Indirect Expenses', type: 'expense', parent_id: null, level: 1, is_active: true },
      { id: 'g-up', code: 'EXP.UP', name: 'Upkeep', type: 'expense', parent_id: 'g-ie', level: 2, is_active: true },
    ],
  }),
}));

const LINES = {
  data: [{
    line_id: 'l1', entry_id: 'e1', entry_number: 7, entry_date: '2026-05-10', source_type: 'vendor_bill', narration: 'Lift repair',
    account_id: 'a1', account_code: '5101', account_name: 'Repairs', debit: '300.00', credit: '0.00', posted_by_name: 'Ravi',
    is_reversed: true, is_reversal: false, document_type: 'vendor_bill', document_number: 'BILL-00004',
  }],
  total: 1,
  totals: { debit: '300.00', credit: '0.00' },
};

const get = vi.mocked(api.get);
beforeEach(() => {
  search.params = new URLSearchParams();
  get.mockImplementation(async (path: string) => {
    if (path === '/ledger/query/lines') return LINES;
    if (path === '/ledger/query/posters') return { data: [{ user_id: 'u-9', name: 'Meera Treasurer' }] };
    if (path === '/ledger/accounts') return { data: [{ id: 'a1', code: '5101', name: 'Repairs', group_id: 'g-up', is_active: true }], total: 1 };
    return { data: [], total: 0 };
  });
});
afterEach(() => vi.clearAllMocks());

const wrap = (node: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>);

describe('Query › By Account Group', () => {
  it('fetches a group’s postings and shows the document, marks and totals', async () => {
    wrap(<QueryByAccountPage />);
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'expense' } });
    fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'g-ie' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Documents' }));
    const table = await screen.findByRole('table', { name: 'Postings' });
    expect(get).toHaveBeenCalledWith('/ledger/query/lines', expect.objectContaining({ params: expect.objectContaining({ group_id: 'g-ie' }) }));
    expect(within(table).getByText('Vendor Bill BILL-00004')).toBeTruthy();
    expect(within(table).getByText('(reversed)')).toBeTruthy();
    expect(within(table).getByText('Total (1 lines)')).toBeTruthy();
  });

  it('opens straight on the account the trial balance linked', async () => {
    search.params = new URLSearchParams('account_id=a1&from=2026-05-01&to=2026-05-31');
    wrap(<QueryByAccountPage />);
    await screen.findByRole('table', { name: 'Postings' });
    expect(get).toHaveBeenCalledWith('/ledger/query/lines', { params: expect.objectContaining({ account_id: 'a1', from_date: '2026-05-01', to_date: '2026-05-31' }) });
  });
});

describe('Query › By User', () => {
  it('fetches only one user’s voided transactions with both ranges', async () => {
    wrap(<QueryByUserPage />);
    const user = await screen.findByLabelText('User');
    await waitFor(() => expect(within(user as HTMLElement).getByText('Meera Treasurer')).toBeTruthy());
    fireEvent.change(user, { target: { value: 'u-9' } });
    fireEvent.change(screen.getByLabelText('Entered on from'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Transaction date to'), { target: { value: '2026-09-30' } });
    fireEvent.click(screen.getByLabelText('Journal Entries'));
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Only Voided Transactions' }));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/ledger/journal-entries', expect.anything()));
    expect(get).toHaveBeenCalledWith('/ledger/journal-entries', {
      params: { limit: '100', offset: '0', posted_by: 'u-9', document_type: 'journal_entries', created_from: '2026-10-01', end_date: '2026-09-30', voided_only: 'true' },
    });
  });

  it('refuses more than 500 transactions', async () => {
    wrap(<QueryByUserPage />);
    fireEvent.change(screen.getByLabelText('No. of transactions'), { target: { value: '600' } });
    expect((await screen.findByRole('alert')).textContent).toContain('1 to 500');
  });
});
