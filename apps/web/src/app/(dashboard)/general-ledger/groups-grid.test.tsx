import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { GroupsPage } from './chart-of-accounts/groups/groups-page';

// General Ledger › Chart of Accounts › Groups as four editable lists (GL-13, GL-S5).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const SOCIETY = '11111111-1111-4111-8111-111111111111';
function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', SOCIETY);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: SOCIETY, name: 'S', role }] }),
  );
}

const group = (id: string, code: string, name: string, type: string, parent: string | null = null) => ({
  id, code, name, type, parent_id: parent, level: parent ? 2 : 1, is_active: true, sort_order: 0, tenant_id: SOCIETY,
});
const GROUPS = [
  group('g-ca', 'CA', 'Current Assets', 'asset'),
  group('g-cl', 'CL', 'Current Liabilities', 'liability'),
  group('g-eq', 'EQ', 'Reserves', 'equity'),
  group('g-in', 'IN', 'Direct Income', 'income'),
  group('g-ex', 'EX', 'Repairs', 'expense'),
];

const put = vi.mocked(api.put);

beforeEach(() => {
  signIn('accountant');
  vi.mocked(api.get).mockResolvedValue({ data: GROUPS });
  put.mockResolvedValue({ data: { created: 1, updated: 1, deactivated: 0 } });
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <GroupsPage />
    </QueryClientProvider>,
  );
}

const grid = (label: string) => screen.getByRole('table', { name: `${label} groups` });
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const saveChanges = () => fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

describe('Groups', () => {
  it('shows four grids, equity groups in Liabilities marked', async () => {
    renderPage();
    await screen.findByDisplayValue('Current Assets');
    for (const label of ['Assets', 'Liabilities', 'Income', 'Expense']) expect(grid(label)).toBeTruthy();
    expect(within(grid('Liabilities')).getByDisplayValue('Reserves')).toBeTruthy();
    expect(within(grid('Liabilities')).getByText('(Equity)')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Save Changes/ })).toHaveLength(1);
  });

  it('saves a new Income group and a renamed Expense group with one Save Changes', async () => {
    renderPage();
    await screen.findByDisplayValue('Repairs');
    fireEvent.change(input('Expense name, row 1'), { target: { value: 'Repairs & Upkeep' } });
    fireEvent.change(input('Income - GL No, row 2'), { target: { value: 'IN-EV' } });
    fireEvent.change(input('Income name, row 2'), { target: { value: 'Event Income' } });
    saveChanges();

    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put).toHaveBeenCalledWith('/ledger/account-groups/bulk', {
      rows: [
        { type: 'income', code: 'IN-EV', name: 'Event Income', parent_id: null },
        { id: 'g-ex', type: 'expense', code: 'EX', name: 'Repairs & Upkeep', parent_id: null },
      ],
      deactivations: [],
    });
  });

  it('gives a new Liabilities row its parent’s type, so equity can be added under equity', async () => {
    renderPage();
    await screen.findByDisplayValue('Reserves');
    fireEvent.change(input('Liabilities - GL No, row 3'), { target: { value: 'EQ-1' } });
    fireEvent.change(input('Liabilities name, row 3'), { target: { value: 'Corpus Fund' } });
    fireEvent.change(screen.getByLabelText('Liabilities parent group, row 3'), { target: { value: 'g-eq' } });
    saveChanges();

    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put.mock.calls[0][1]).toEqual({
      rows: [{ type: 'equity', code: 'EQ-1', name: 'Corpus Fund', parent_id: 'g-eq' }],
      deactivations: [],
    });
  });

  it('shows the API’s refusal to delete a group that holds accounts on that row', async () => {
    put.mockRejectedValue(
      new ApiError(400, {
        message: 'Some rows could not be saved.',
        code: 'bulk_rows_invalid',
        errors: { 'deactivations.0.id': ['Cannot deactivate group with active ledger accounts'] },
      } as never),
    );
    renderPage();
    await screen.findByDisplayValue('Repairs');
    fireEvent.click(within(grid('Expense')).getByRole('button', { name: 'Delete row 1' }));
    saveChanges();

    await waitFor(() => expect(within(grid('Expense')).getByRole('alert').textContent).toBe('Cannot deactivate group with active ledger accounts'));
    expect(put.mock.calls[0][1]).toEqual({ rows: [], deactivations: ['g-ex'] });
  });

  it('refuses a GL No used in two grids before sending anything', async () => {
    renderPage();
    await screen.findByDisplayValue('Repairs');
    fireEvent.change(input('Income - GL No, row 2'), { target: { value: 'EX' } });
    fireEvent.change(input('Income name, row 2'), { target: { value: 'Copy' } });
    saveChanges();

    expect(await screen.findAllByText('GL No already used')).toHaveLength(2);
    expect(put).not.toHaveBeenCalled();
  });
});
