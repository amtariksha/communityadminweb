import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { TaxRegisterPage } from './tax-register-page';
import { remitProblem } from './remit-dialog';

// Bank & Cash › Taxes registers and Remit (BANK-15, BANK-16).

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const SOCIETY = '11111111-1111-4111-8111-111111111111';
const REGISTER = {
  register: 'sgst', opening_balance: '0.00', closing_balance: '-900.00',
  rows: [
    { journal_line_id: 'l1', journal_entry_id: 'e1', date: '2026-05-02', voucher_no: 'BILL-00007', particulars: 'Lift repair', party: 'Skyline Lifts', section: null, ledger: 'input', debit: '900.00', credit: '0.00', balance: '900.00', challan_no: null },
    { journal_line_id: 'l2', journal_entry_id: 'e2', date: '2026-05-03', voucher_no: 'INV-00012', particulars: 'Maintenance', party: 'A-101', section: null, ledger: 'output', debit: '0.00', credit: '1800.00', balance: '-900.00', challan_no: null },
  ],
};

beforeEach(() => {
  localStorage.setItem('communityos_tenant', SOCIETY);
  localStorage.setItem('communityos_user', JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role: 'accountant', societies: [{ id: SOCIETY, name: 'S', role: 'accountant' }] }));
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === '/bank/accounts') return { data: [{ id: 'ba-1', bank_name: 'Canara Bank', account_number: '000123456781', is_active: true }] };
    return { data: REGISTER };
  });
  vi.mocked(api.post).mockResolvedValue({ data: {} });
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function renderPage(register: 'tds' | 'sgst' = 'sgst') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TaxRegisterPage register={register} />
    </QueryClientProvider>,
  );
}

describe('tax registers', () => {
  it('fetches the Input State GST register and shows the closing balance in credit', async () => {
    renderPage();
    expect(screen.getByText('Choose the period and press Fetch.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Input State GST'));
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
    const table = await screen.findByRole('table', { name: 'Tax register' });
    expect(vi.mocked(api.get).mock.calls.find(([path]) => path === '/bank/tax-registers/sgst')?.[1]).toEqual({ params: expect.objectContaining({ ledger: 'input' }) });
    expect(within(table).getByText('Skyline Lifts')).toBeTruthy();
    expect(within(table).getAllByRole('row').at(-1)?.textContent).toContain('₹900 Cr');
  });

  it('remits GST only when output settled equals input used plus cash paid', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Remit' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Period from'), { target: { value: '2026-04-01' } });
    fireEvent.change(within(dialog).getByLabelText('Period to'), { target: { value: '2026-06-30' } });
    fireEvent.change(within(dialog).getByLabelText('Output settled'), { target: { value: '1800' } });
    fireEvent.change(within(dialog).getByLabelText('Input used'), { target: { value: '900' } });
    fireEvent.change(within(dialog).getByLabelText('Cash paid'), { target: { value: '800' } });
    expect(within(dialog).getByRole('alert').textContent).toBe('Output settled must equal input used plus cash paid');
    fireEvent.change(within(dialog).getByLabelText('Cash paid'), { target: { value: '900' } });
    await waitFor(() => expect(within(dialog).getByRole('option', { name: 'Canara Bank (6781)' })).toBeTruthy());
    fireEvent.change(within(dialog).getByLabelText('Paid from'), { target: { value: 'ba-1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remit' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/bank/tax-registers/remit', expect.objectContaining({
      register: 'sgst', output_settled: 1800, input_used: 900, cash_paid: 900, bank_account_id: 'ba-1',
    })));
  });

  it('checks a TDS remittance needs section, challan, amount and bank', () => {
    const base = { section: '', amount: '', challan: '', bsr: '', from: '', to: '', output: '', input: '', cash: '', reference: '', bank: '', date: '2026-07-07' };
    expect(remitProblem('tds', base)).toBe('Enter the section and the challan number.');
    expect(remitProblem('tds', { ...base, section: '393(1)', challan: 'CH-1', amount: '3000' })).toBe('Choose the bank account paid from.');
    expect(remitProblem('tds', { ...base, section: '393(1)', challan: 'CH-1', amount: '3000', bank: 'ba-1' })).toBeNull();
  });
});
