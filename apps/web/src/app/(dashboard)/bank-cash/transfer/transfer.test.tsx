import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { TransferPage } from './transfer-page';

// Bank & Cash › Transfer with its inline create row (BANK-06, BANK-S2).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), download: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const ACCOUNTS = [
  { id: 'ba-1', bank_name: 'Canara Bank', account_number: '000123456781', ifsc_code: 'CNRB0000001', account_type: 'savings', branch: 'Main', is_active: true },
  { id: 'ba-2', bank_name: 'Union Bank', account_number: '000987654322', ifsc_code: 'UBIN0000002', account_type: 'current', branch: 'Main', is_active: true },
];
const OLD = { id: 't-1', from_account_id: 'ba-1', to_account_id: 'ba-2', from_account_name: 'Canara Bank', to_account_name: 'Union Bank', amount: 1000, transfer_date: '2026-10-01', reference_number: 'UTR1', notes: 'Old move' };
const NEW = { ...OLD, id: 't-2', amount: 5000, transfer_date: '2026-10-19', reference_number: 'CHQ 4411', notes: 'Corpus to FD account' };

let transfers = [OLD];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T06:00:00Z'));
  transfers = [OLD];
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === '/bank/accounts') return { data: ACCOUNTS };
    return { data: transfers, total: transfers.length };
  });
  vi.mocked(api.post).mockImplementation(async () => {
    transfers = [NEW, OLD];
    return { data: NEW };
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TransferPage />
    </QueryClientProvider>,
  );
}

describe('Transfer page', () => {
  it('records a transfer from the inline row, without a dialog, and lists it at the top', async () => {
    renderPage();
    const table = await screen.findByRole('table', { name: 'Bank & Cash Transfers' });
    await within(table).findByText('Old move');
    const row = screen.getByRole('form', { name: 'New transfer' });
    expect((within(row).getByLabelText('Transfer Date') as HTMLInputElement).value).toBe('2026-10-19');
    expect([...(within(row).getByLabelText('From') as HTMLSelectElement).options].map((option) => option.textContent)).toEqual([
      'Select account',
      'Canara Bank (6781)',
      'Union Bank (4322)',
    ]);

    fireEvent.change(within(row).getByLabelText('From'), { target: { value: 'ba-1' } });
    fireEvent.change(within(row).getByLabelText('To'), { target: { value: 'ba-2' } });
    fireEvent.change(within(row).getByLabelText('Amount'), { target: { value: '5000' } });
    fireEvent.change(within(row).getByLabelText('Instrument No.'), { target: { value: 'CHQ 4411' } });
    fireEvent.change(within(row).getByLabelText('Comment'), { target: { value: 'Corpus to FD account' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Transfer' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/bank/transfers', {
        from_account_id: 'ba-1',
        to_account_id: 'ba-2',
        amount: 5000,
        transfer_date: '2026-10-19',
        reference_number: 'CHQ 4411',
        narration: 'Corpus to FD account',
      }),
    );
    await waitFor(() => expect(within(table).getAllByRole('row')[1].textContent).toContain('Corpus to FD account'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect((within(row).getByLabelText('Amount') as HTMLInputElement).value).toBe('');
  });

  it('never offers the From account as the To account', async () => {
    renderPage();
    await screen.findByText('Old move');
    const row = screen.getByRole('form', { name: 'New transfer' });
    fireEvent.change(within(row).getByLabelText('From'), { target: { value: 'ba-1' } });
    expect([...(within(row).getByLabelText('To') as HTMLSelectElement).options].map((option) => option.value)).toEqual(['', 'ba-2']);
  });
});

describe('Transfer parity (BANK-10)', () => {
  const SOCIETY = '11111111-1111-4111-8111-111111111111';
  beforeEach(() => {
    localStorage.setItem('communityos_tenant', SOCIETY);
    localStorage.setItem('communityos_user', JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role: 'accountant', societies: [{ id: SOCIETY, name: 'S', role: 'accountant' }] }));
    transfers = [
      { ...OLD, transfer_number: 'TRF-00001', transferred_by_name: 'Ravi Treasurer', status: 'active' } as typeof OLD,
      { ...NEW, transfer_number: 'TRF-00002', status: 'cancelled', cancel_reason: 'Duplicate' } as typeof OLD,
    ];
  });
  afterEach(() => localStorage.clear());

  it('shows the number and who transferred, Cancelled rows, and cancels with a reason', async () => {
    renderPage();
    const table = await screen.findByRole('table', { name: 'Bank & Cash Transfers' });
    await within(table).findByText('TRF-00001');
    const rows = within(table).getAllByRole('row');
    expect(rows[1].textContent).toContain('TRF-00001');
    expect(rows[1].textContent).toContain('Ravi Treasurer');
    expect(rows[2].textContent).toContain('Cancelled');
    expect(within(rows[2]).queryByRole('button', { name: 'Cancel' })).toBeNull();

    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Cancel transfer' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Wrong account' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/bank/transfers/t-1/cancel', { reason: 'Wrong account' }));
  });
});
