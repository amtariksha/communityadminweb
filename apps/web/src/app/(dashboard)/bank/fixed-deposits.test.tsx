import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { FixedDepositsTab } from './fixed-deposits-tab';

// Fixed deposits: Archive and the FD's own ledger made with it (BANK-11, BANK-S8 / S9).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const ACCOUNT = { id: 'ba-1', bank_name: 'Canara Bank', account_number: '000123456781', ifsc_code: 'CNRB0000001', account_type: 'savings', is_active: true };
const FD = (id: string, status: string, extra = {}) => ({
  id, bank_account_id: 'ba-1', bank_name: 'Canara Bank', fd_number: `FD-${id}`, principal_amount: 100000, interest_rate: 7,
  start_date: '2026-04-01', maturity_date: '2030-03-31', maturity_amount: 120000, status, ...extra,
});

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue({ data: [FD('1', 'active'), FD('2', 'matured'), FD('3', 'matured', { archived_at: '2026-09-01' })] });
  vi.mocked(api.post).mockResolvedValue({ data: {} });
});
afterEach(() => vi.clearAllMocks());

function renderTab(scope: 'active' | 'archived' | 'all' = 'all') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FixedDepositsTab accounts={[ACCOUNT as never]} ledgerAccounts={[]} scope={scope} />
    </QueryClientProvider>,
  );
}

describe('fixed deposits archive', () => {
  it('archives an active FD only as an early withdrawal with the amount received', async () => {
    renderTab('active');
    const row = (await screen.findByText('FD-1')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Needed the corpus' } });
    const archive = within(dialog).getByRole('button', { name: 'Archive' }) as HTMLButtonElement;
    expect(archive.disabled).toBe(true);
    fireEvent.click(within(dialog).getByLabelText('Withdraw early'));
    fireEvent.change(within(dialog).getByLabelText('Amount received'), { target: { value: '102000' } });
    fireEvent.click(archive);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/bank/fixed-deposits/1/archive', { reason: 'Needed the corpus', withdraw_early: true, amount_received: 102000 }));
  });

  it('offers no Archive on an FD already archived, and links to the journal form', async () => {
    renderTab('archived');
    const archived = (await screen.findByText('FD-3')).closest('tr') as HTMLElement;
    expect(within(archived).queryByRole('button', { name: 'Archive' })).toBeNull();
    expect(screen.getByText('Pass journal entries between assets and FDs').getAttribute('href')).toBe('/general-ledger/journal-entries/create');
  });

  it('creates the FD with a new FD account', async () => {
    renderTab();
    await screen.findByText('FD-1');
    fireEvent.click(screen.getByRole('button', { name: /Create FD/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Bank Account'), { target: { value: 'ba-1' } });
    fireEvent.change(within(dialog).getByLabelText('FD Number'), { target: { value: 'FD-9' } });
    fireEvent.change(within(dialog).getByLabelText('Principal Amount'), { target: { value: '50000' } });
    fireEvent.change(within(dialog).getByLabelText('Interest Rate (%)'), { target: { value: '7' } });
    fireEvent.change(within(dialog).getByLabelText('Start Date'), { target: { value: '2026-10-01' } });
    fireEvent.change(within(dialog).getByLabelText('Maturity Date'), { target: { value: '2027-10-01' } });
    fireEvent.change(within(dialog).getByLabelText('Maturity Amount'), { target: { value: '53500' } });
    fireEvent.click(within(dialog).getByLabelText('Create new fixed deposit account'));
    fireEvent.change(within(dialog).getByLabelText('GL Account No.'), { target: { value: 'INV-9' } });
    fireEvent.change(within(dialog).getByLabelText('Account Name'), { target: { value: 'FD Canara 9' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create FD' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/bank/fixed-deposits', expect.objectContaining({
      fd_number: 'FD-9', new_ledger: { code: 'INV-9', name: 'FD Canara 9', group: 'INV' },
    })));
    expect(vi.mocked(api.post).mock.calls[0][1]).not.toHaveProperty('fd_account_id');
  });
});
