import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { BankSetupPage } from './bank-setup-page';

// Bank & Cash › Setup (BANK-17, screen BANK-S1).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
const access = vi.hoisted(() => ({ admin: true }));
vi.mock('../../settings/settings-access', () => ({ canChangeSettings: () => access.admin }));

const SCREEN = {
  accounting_start_date: '2024-04-01',
  settings: { bank_pg_auto_reconcile: false, bank_pg_settlement_account_id: null, bank_reconcile_blocked_user_ids: [] },
  accounts: [{ id: 'ba-1', gl_no: 'BNK_1', account_name: 'Canara Bank (…6781)', type: 'Bank', opening_balance: '1000.00', opening_balance_date: '2024-04-01' }],
  admin_users: [{ user_id: 'u-acc', name: 'Asha Accounts', roles: ['accountant'] }],
};

beforeEach(() => {
  access.admin = true;
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === '/bank/accounts') return { data: [{ id: 'ba-1', bank_name: 'Canara Bank', account_number: '000123456781', is_active: true, account_kind: 'bank' }] };
    return { data: SCREEN };
  });
  vi.mocked(api.put).mockResolvedValue({ data: SCREEN });
});
afterEach(() => vi.clearAllMocks());

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BankSetupPage />
    </QueryClientProvider>,
  );

describe('Bank & Cash Setup', () => {
  it('saves auto-reconciliation with its bank and a barred user', async () => {
    renderPage();
    expect(await screen.findByText('Accounting start date: 01 Apr 2024')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Enable automatic payment-gateway reconciliation'));
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Canara Bank (6781)' })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Bank account that receives gateway payments'), { target: { value: 'ba-1' } });
    fireEvent.click(screen.getByLabelText(/Asha Accounts/));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/bank/setup', {
      bank_pg_auto_reconcile: true, bank_pg_settlement_account_id: 'ba-1', bank_reconcile_blocked_user_ids: ['u-acc'],
    }));
  });

  it('is read-only for anyone but the community admin, and lists the accounts', async () => {
    access.admin = false;
    renderPage();
    expect(await screen.findByText(/Only the society's administrator can change these settings./)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect((screen.getByLabelText('Enable automatic payment-gateway reconciliation') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole('table', { name: 'Bank & Petty Cash Accounts' }).textContent).toContain('Canara Bank (…6781)');
  });
});
