import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { ChartTabPage } from './chart-of-accounts/chart-tab-page';

// General Ledger › Chart of Accounts as one editable list per type (GL-12).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn(), download: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const SOCIETY = '11111111-1111-4111-8111-111111111111';
function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', SOCIETY);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: SOCIETY, name: 'S', role }] }),
  );
}

const group = (id: string, code: string, name: string, type: string) => ({ id, code, name, type, parent_id: null, level: 1, is_active: true, sort_order: 0, tenant_id: SOCIETY });
const GROUPS = [
  group('g-ca', 'CA', 'Current Assets', 'asset'),
  group('g-cl', 'CL', 'Current Liabilities', 'liability'),
  group('g-eq', 'EQ', 'Reserves', 'equity'),
];
const account = (id: string, code: string, name: string, groupId: string, extra = {}) => ({
  id, code, name, group_id: groupId, opening_balance: 0, balance_type: 'debit', is_system: false, is_active: true, tenant_id: SOCIETY, is_bank_account: false, bank_details: null, created_at: '2026-04-01', ...extra,
});
const ASSETS = [
  account('a-bank', 'bank', 'Bank', 'g-ca', { is_system: true }),
  account('a-dep', 'A-100', 'Sinking Fund Deposit', 'g-ca', { opening_balance: 1000 }),
  account('a-lift', 'A-101', 'Lift Deposit', 'g-ca'),
];

const get = vi.mocked(api.get);
const put = vi.mocked(api.put);

beforeEach(() => {
  signIn('accountant');
  get.mockImplementation(async (path: string) => {
    if (path === '/ledger/account-groups') return { data: GROUPS };
    return { data: ASSETS, total: ASSETS.length };
  });
  put.mockResolvedValue({ data: { created: 1, updated: 2, entries_posted: 0 } });
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function renderTab(slug: 'assets' | 'liabilities' = 'assets') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ChartTabPage slug={slug} />
    </QueryClientProvider>,
  );
}

const field = (label: string, row: number) => screen.getByLabelText(`${label}, row ${row}`) as HTMLInputElement;

describe('Chart of Accounts grid', () => {
  it('lists the type’s accounts with five spare rows, a system account’s code and group locked', async () => {
    renderTab();
    expect(await screen.findByDisplayValue('Sinking Fund Deposit')).toBeTruthy();
    expect(within(screen.getByRole('table', { name: 'Set up Asset Accounts' })).getAllByRole('row')).toHaveLength(1 + 3 + 5);
    expect(field('GL Account No.', 1).disabled).toBe(true);
    expect((screen.getByLabelText('Group, row 1') as HTMLSelectElement).disabled).toBe(true);
    expect(field('Account Name', 1).disabled).toBe(false);
    expect(get).toHaveBeenCalledWith('/ledger/accounts', { params: { page: '1', limit: '100', account_type: 'asset' } });
  });

  it('saves two edited names and one new row in one call, leaving unchanged rows out', async () => {
    renderTab();
    await screen.findByDisplayValue('Sinking Fund Deposit');
    fireEvent.change(field('Account Name', 2), { target: { value: 'Sinking Fund FD' } });
    fireEvent.change(field('Account Name', 3), { target: { value: 'Elevator Deposit' } });
    fireEvent.change(screen.getByLabelText('Group, row 4'), { target: { value: 'g-ca' } });
    fireEvent.change(field('GL Account No.', 4), { target: { value: 'A-102' } });
    fireEvent.change(field('Account Name', 4), { target: { value: 'Water Deposit' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put).toHaveBeenCalledWith('/ledger/accounts/bulk', {
      type: 'asset',
      rows: [
        { id: 'a-dep', group_id: 'g-ca', code: 'A-100', name: 'Sinking Fund FD', opening_balance: 1000 },
        { id: 'a-lift', group_id: 'g-ca', code: 'A-101', name: 'Elevator Deposit', opening_balance: 0 },
        { group_id: 'g-ca', code: 'A-102', name: 'Water Deposit', opening_balance: 0 },
      ],
    });
  });

  it('sends a changed opening balance', async () => {
    renderTab();
    await screen.findByDisplayValue('Sinking Fund Deposit');
    fireEvent.change(field('Opening Balance', 2), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put.mock.calls[0][1]).toEqual({
      type: 'asset',
      rows: [{ id: 'a-dep', group_id: 'g-ca', code: 'A-100', name: 'Sinking Fund Deposit', opening_balance: 1500 }],
    });
  });

  it('refuses a GL Account No. used twice before sending anything', async () => {
    renderTab();
    await screen.findByDisplayValue('Sinking Fund Deposit');
    fireEvent.change(field('GL Account No.', 3), { target: { value: 'A-100' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    expect(await screen.findAllByText('GL Account No. already used')).toHaveLength(2);
    expect(put).not.toHaveBeenCalled();
  });

  it('shows the API’s row error on the row it names', async () => {
    put.mockRejectedValue(
      new ApiError(400, { message: 'One row could not be saved.', code: 'bulk_rows_invalid', errors: { 'rows.0.code': ['GL Account No. already used'] } } as never),
    );
    renderTab();
    await screen.findByDisplayValue('Sinking Fund Deposit');
    fireEvent.change(field('GL Account No.', 3), { target: { value: 'bank-2' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    const rows = within(screen.getByRole('table', { name: 'Set up Asset Accounts' })).getAllByRole('row');
    await waitFor(() => expect(within(rows[3]).getByRole('alert').textContent).toBe('GL Account No. already used'));
  });

  it('lists equity groups in Liabilities, marked, with no balance column', async () => {
    get.mockImplementation(async (path: string) => (path === '/ledger/account-groups' ? { data: GROUPS } : { data: [], total: 0 }));
    renderTab('liabilities');
    const select = (await screen.findByLabelText('Group, row 1')) as HTMLSelectElement;
    expect([...select.options].map((option) => option.textContent)).toEqual(['Select…', 'CL — Current Liabilities', 'EQ — Reserves (Equity)']);
    expect(screen.queryByText('Opening Balance')).toBeNull();
  });

  it('is read-only for a committee member', async () => {
    signIn('committee_member');
    renderTab();
    await screen.findByDisplayValue('Sinking Fund Deposit');
    expect(screen.queryByRole('button', { name: /Save Changes/ })).toBeNull();
    expect(screen.getByRole('note').textContent).toContain('community admin and the accountant');
  });
});
