import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render as baseRender, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { numberRangeParams } from './number-range-filter';
import { registerBoxParams } from './register-box';
import { CreditNotesRegister, InvoicesRegister, ReceiptsRegister } from './registers';

/** INC-36 — the classic registers as fetch boxes; INC-44 — their filters. */

const TENANT = '11111111-1111-4111-8111-111111111111';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ api: { get: mocks.get, download: vi.fn(), post: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-ledger', () => ({
  useLedgerAccounts: () => ({ data: { data: [{ id: 'acc-1', code: 'parking', name: 'Parking Income' }] } }),
}));

const render = (ui: ReactElement) =>
  baseRender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

const RECEIPT = {
  id: 'r1',
  receipt_number: 'RCT-0107',
  receipt_date: '2026-10-10',
  unit_id: null,
  unit_number: null,
  payer_name: null,
  customer_name: null,
  income_account_name: 'Other Income',
  payment_mode: 'cash',
  reference_number: null,
  bank_account_name: 'Cash in Hand',
  amount: '750.00',
  voided_at: '2026-10-11T05:00:00Z',
  allocated_invoices: [],
  email_status: null,
};

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'me', name: 'Me', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: TENANT, name: 'Green Acres', role }] }),
  );
}

const box = (name: string) => screen.getByRole('region', { name });

beforeEach(() => {
  signIn('accountant');
  mocks.get.mockResolvedValue({ data: [RECEIPT], total: 1 });
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('registerBoxParams', () => {
  it('names dates start_date / end_date and numbers from_number / to_number, after the fixed parameters', () => {
    expect(registerBoxParams('date', { from: '2026-10-01', to: '2026-10-31', choice: '' }, { voided: 'true' })).toEqual({
      voided: 'true',
      start_date: '2026-10-01',
      end_date: '2026-10-31',
    });
    expect(registerBoxParams('number', { from: '105', to: '', choice: '' }, { posted: 'true' }, { account_id: 'a' })).toEqual({
      posted: 'true',
      account_id: 'a',
      from_number: '105',
    });
  });

  it('sends only whole numbers from the standard lists', () => {
    expect(numberRangeParams({ from: '105', to: '110' })).toEqual({ from_number: '105', to_number: '110' });
    expect(numberRangeParams({ from: '', to: '1x' })).toEqual({});
  });
});

describe('Receipts register (INC-S25)', () => {
  it('shows four boxes and loads nothing until a Fetch', () => {
    render(<ReceiptsRegister />);
    for (const name of ['Unsent Email Receipts', 'Receipts Posted From … To …', 'Receipts by Number From … To …', 'Voided Receipts']) {
      expect(box(name)).toBeTruthy();
    }
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('fetches Voided Receipts with its own parameters only and lists a receipt with no unit as "—"', async () => {
    render(<ReceiptsRegister />);
    fireEvent.click(within(box('Voided Receipts')).getByRole('button', { name: 'Fetch' }));
    await vi.waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    expect(mocks.get).toHaveBeenCalledWith('/receipts', { params: { voided: 'true', page: '1', limit: '25' } });
    const table = await within(box('Voided Receipts')).findByRole('table');
    await within(table).findByText('RCT-0107');
    expect(within(table).getAllByRole('cell').map((cell) => cell.textContent)).toContain('—');
    expect(within(box('Unsent Email Receipts')).queryByText('RCT-0107')).toBeNull();
  });

  it('asks for both numbers before fetching by number', () => {
    render(<ReceiptsRegister />);
    fireEvent.click(within(box('Receipts by Number From … To …')).getByRole('button', { name: 'Fetch' }));
    expect(within(box('Receipts by Number From … To …')).getByRole('alert').textContent).toBe('Enter a from and a to number.');
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('says so when the server ignored the filters (an API older than INC-44)', async () => {
    const { bank_account_name: _omitted, ...oldRow } = RECEIPT;
    mocks.get.mockResolvedValue({ data: [oldRow], total: 1 });
    render(<ReceiptsRegister />);
    fireEvent.click(within(box('Voided Receipts')).getByRole('button', { name: 'Fetch' }));
    expect(await within(box('Voided Receipts')).findByText(/need the latest server update/)).toBeTruthy();
  });
});

describe('Invoices register (INC-S27)', () => {
  it('shows five boxes; by income account needs an account and then sends it with posted only', async () => {
    mocks.get.mockResolvedValue({ data: [], total: 0 });
    render(<InvoicesRegister />);
    expect(screen.getAllByRole('region')).toHaveLength(5);
    const byAccount = box('Invoices by Income Account');
    fireEvent.click(within(byAccount).getByRole('button', { name: 'Fetch' }));
    expect(within(byAccount).getByRole('alert').textContent).toBe('Choose an income account.');
    fireEvent.change(within(byAccount).getByLabelText('Income account'), { target: { value: 'acc-1' } });
    fireEvent.click(within(byAccount).getByRole('button', { name: 'Fetch' }));
    await vi.waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith('/invoices', { params: { posted: 'true', account_id: 'acc-1', page: '1', limit: '25' } }),
    );
    expect(await within(byAccount).findByText('No invoices match.')).toBeTruthy();
  });

  it('fetches reversed invoices as cancelled ones in the date range', async () => {
    mocks.get.mockResolvedValue({ data: [], total: 0 });
    render(<InvoicesRegister />);
    const reversed = box('Reversed Invoices From … To …');
    fireEvent.change(within(reversed).getByLabelText('Date from'), { target: { value: '2026-10-01' } });
    fireEvent.change(within(reversed).getByLabelText('Date to'), { target: { value: '2026-10-31' } });
    fireEvent.click(within(reversed).getByRole('button', { name: 'Fetch' }));
    await vi.waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith('/invoices', {
        params: { status: 'cancelled', start_date: '2026-10-01', end_date: '2026-10-31', page: '1', limit: '25' },
      }),
    );
  });
});

describe('Credit Notes register (INC-S26)', () => {
  it('fetches unsent credit notes from the credit-note list', async () => {
    mocks.get.mockResolvedValue({ data: [], total: 0 });
    render(<CreditNotesRegister />);
    expect(screen.getAllByRole('region')).toHaveLength(2);
    fireEvent.click(within(box('Unsent Email Credit Notes')).getByRole('button', { name: 'Fetch' }));
    await vi.waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith('/receipts/credit-notes', { params: { unsent_email: 'true', page: '1', limit: '25' } }),
    );
  });
});
