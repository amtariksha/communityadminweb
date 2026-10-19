import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomeAccount } from '@/hooks/use-income-accounts';
import { IncomeAccountsContent, checkIncomeRows } from './income-accounts-content';

/** INC-38 — Setup › Income Accounts: two grids, used for / display order / HSN/SAC. */

const TENANT = '11111111-1111-4111-8111-111111111111';
const mocks = vi.hoisted(() => ({ save: vi.fn(), accounts: [] as IncomeAccount[] }));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-income-accounts', () => ({
  useIncomeAccounts: () => ({ data: mocks.accounts, isLoading: false, error: null, dataUpdatedAt: 1 }),
  useSaveIncomeAccounts: () => ({ mutateAsync: mocks.save, isPending: false }),
}));

const account = (id: string, name: string, extra: Partial<IncomeAccount> = {}): IncomeAccount => ({
  id,
  code: id,
  name,
  is_system: false,
  is_active: true,
  income_scope: 'member',
  invoice_display_order: null,
  hsn_sac: null,
  ...extra,
});

beforeEach(() => {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'me', name: 'Me', phone: '+910000000010', isSuperAdmin: false, role: 'accountant', societies: [{ id: TENANT, name: 'Green Acres', role: 'accountant' }] }),
  );
  mocks.accounts = [
    account('maint', 'Maintenance Income', { is_system: true, invoice_display_order: 2 }),
    account('park', 'Parking', { income_scope: 'both' }),
    account('ads', 'Advertising', { income_scope: 'non_member', hsn_sac: '998361' }),
  ];
  mocks.save.mockResolvedValue([]);
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Income Accounts (INC-S5)', () => {
  it('splits the accounts into the member grid (member and both) and the non-member grid', () => {
    render(<IncomeAccountsContent />);
    const member = screen.getByRole('table', { name: 'Member Income Accounts' });
    const nonMember = screen.getByRole('table', { name: 'Non-Member Income Accounts' });
    expect(within(member).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'S.No', 'GL No.', 'Account Name', 'Used for', 'Invoice Display Order', 'HSN/SAC',
    ]);
    expect(within(member).getByText('Maintenance Income *')).toBeTruthy();
    expect(within(member).getByText('Parking')).toBeTruthy();
    expect(within(nonMember).getByText('Advertising')).toBeTruthy();
  });

  it('sends the changed row of its own grid only', async () => {
    render(<IncomeAccountsContent />);
    const member = screen.getByRole('region', { name: 'Member Income Accounts' });
    fireEvent.change(within(member).getByLabelText('Invoice Display Order, row 2'), { target: { value: '1' } });
    fireEvent.change(within(member).getByLabelText('HSN/SAC, row 2'), { target: { value: '996722' } });
    fireEvent.click(within(member).getByRole('button', { name: /Save Changes/ }));
    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save).toHaveBeenCalledWith([{ id: 'park', income_scope: 'both', invoice_display_order: 1, hsn_sac: '996722' }]);
  });

  it('checks display order and HSN/SAC before saving', () => {
    const row = (order: string, hsn: string) => ({ key: 'k', values: { code: '', name: '', scope: 'member' as const, order, hsn } });
    expect(checkIncomeRows([row('1000', '')])).toEqual({ k: 'Display order is 1 to 999.' });
    expect(checkIncomeRows([row('3', '12345')])).toEqual({ k: 'HSN/SAC is 4, 6 or 8 digits.' });
    expect(checkIncomeRows([row('3', '9995')])).toEqual({});
  });
});
