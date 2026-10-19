import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { AccountsTab } from './accounts-tab';
import { ChequesTab } from './cheques-tab';

// BANK-07: the cheque actions and account Edit that had APIs and no buttons.

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const cheque = (id: string, number: string, status: string, extra = {}) => ({
  id, bank_account_id: 'ba-1', bank_name: 'Canara Bank', cheque_number: number, payee: 'Shree Lifts', amount: 12000,
  issue_date: '2026-10-01', clearing_date: null, bounce_date: null, status, notes: null, created_at: '2026-10-01', ...extra,
});
let cheques = [cheque('c-1', '000451', 'issued'), cheque('c-2', '000452', 'cleared', { clearing_date: '2026-10-05' })];

const ACCOUNT = { id: 'ba-1', bank_name: 'Canara Bank', account_number: '000123456781', ifsc_code: 'CNRB0000001', account_type: 'savings', branch: 'Main Road', opening_balance: 0, current_balance: 5000, is_primary: true, is_active: true };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T06:00:00Z'));
  cheques = [cheque('c-1', '000451', 'issued'), cheque('c-2', '000452', 'cleared', { clearing_date: '2026-10-05' })];
  vi.mocked(api.get).mockImplementation(async () => ({ data: cheques, total: cheques.length }));
  vi.mocked(api.patch).mockImplementation(async (path: string, body?: unknown) => {
    if (path === '/bank/cheques/c-1/clear') {
      cheques = [cheque('c-1', '000451', 'cleared', { clearing_date: (body as { clearing_date: string }).clearing_date }), cheques[1]];
    }
    return { data: {} };
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderCheques() {
  return render(
    <QueryClientProvider client={client()}>
      <ChequesTab accounts={[]} ledgerAccounts={[]} />
    </QueryClientProvider>,
  );
}

const rowOf = (number: string) => screen.getByText(number).closest('tr') as HTMLElement;

describe('Cheques', () => {
  it('clears an issued cheque on the date asked for, and shows it cleared', async () => {
    renderCheques();
    await screen.findByText('000451');
    fireEvent.click(within(rowOf('000451')).getByRole('button', { name: 'Clear cheque 000451' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Clearing date'), { target: { value: '2026-10-18' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/bank/cheques/c-1/clear', { clearing_date: '2026-10-18' }));
    await waitFor(() => expect(within(rowOf('000451')).getByText('Cleared')).toBeTruthy());
    expect(rowOf('000451').textContent).toContain('18 Oct 2026');
  });

  it('bounces with the bounce date and cancels after a confirm', async () => {
    renderCheques();
    await screen.findByText('000451');
    fireEvent.click(within(rowOf('000451')).getByRole('button', { name: 'Bounce cheque 000451' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Bounce' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/bank/cheques/c-1/bounce', { bounce_date: '2026-10-19' }));

    fireEvent.click(within(rowOf('000451')).getByRole('button', { name: 'Cancel cheque 000451' }));
    expect(within(screen.getByRole('dialog')).queryByLabelText(/date/)).toBeNull();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel cheque' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/bank/cheques/c-1/cancel'));
  });

  it('offers no action on a cheque that is no longer issued', async () => {
    renderCheques();
    await screen.findByText('000452');
    expect(within(rowOf('000452')).queryAllByRole('button')).toHaveLength(0);
  });
});

describe('bank account Edit', () => {
  it('saves a new branch and the card shows it', async () => {
    let account = ACCOUNT;
    vi.mocked(api.patch).mockImplementation(async (_path: string, body?: unknown) => {
      account = { ...account, ...(body as object) };
      return { data: account };
    });
    function Harness() {
      return <AccountsTab accounts={[account]} loading={false} />;
    }
    const { rerender } = render(
      <QueryClientProvider client={client()}>
        <Harness />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit Canara Bank' }));
    const dialog = screen.getByRole('dialog');
    expect((within(dialog).getByLabelText('Branch') as HTMLInputElement).value).toBe('Main Road');
    fireEvent.change(within(dialog).getByLabelText('Branch'), { target: { value: 'Koramangala' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/bank/accounts/ba-1', { bank_name: 'Canara Bank', branch: 'Koramangala', ifsc_code: 'CNRB0000001' }),
    );
    rerender(
      <QueryClientProvider client={client()}>
        <Harness />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Koramangala/)).toBeTruthy();
  });
});
