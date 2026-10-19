import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BillsTab } from './bills-tab';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  addToast: vi.fn(),
  canWrite: true,
}));

const bill = (id: string, unit: string, status: 'pending' | 'invoiced' | 'paid') => ({
  id,
  tenant_id: 't',
  unit_id: `u-${unit}`,
  meter_id: `m-${id}`,
  period_from: '2026-09-01',
  period_to: '2026-09-30',
  consumption: 10,
  amount: 100,
  status,
  invoice_id: null,
  reading_id: null,
  created_at: '2026-10-01',
  meter_number: `W-${id}`,
  meter_type: 'water',
  unit_number: unit,
});

vi.mock('@/hooks', () => ({
  useUtilityBills: () => ({
    isLoading: false,
    data: { data: [bill('1', 'A-101', 'pending'), bill('2', 'A-102', 'pending'), bill('3', 'A-103', 'invoiced')], total: 3 },
  }),
  useBillToInvoice: () => ({ mutate: vi.fn(), isPending: false }),
  useLedgerAccounts: () => ({ data: { data: [] } }),
  useCalculateBills: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('./calculate-bills-dialog', () => ({ CalculateBillsDialog: () => null }));
vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => ({ canRead: true, canWrite: mocks.canWrite }) }));
vi.mock('@/hooks/use-utility-settings', () => ({ useUtilitySettings: () => ({ data: { utility_billing: { auto_post: true } } }) }));
vi.mock('@/hooks/use-utility-batch', () => ({
  useInvoiceBatch: () => ({ mutate: mocks.mutate, isPending: false }),
  batchSummary: () => 'summary',
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/components/ui/account-search-select', () => ({
  AccountSearchSelect: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <select aria-label="Income account" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Pick</option>
      <option value="ledger-water">Water charges</option>
    </select>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
  mocks.canWrite = true;
});

describe('Bills tab — Invoice selected (UTIL-07)', () => {
  it('ticks only pending bills and sends the ticked ids with the dialog choices', () => {
    render(<BillsTab />);

    expect(screen.queryByLabelText('Select bill W-3 A-103')).toBeNull();
    fireEvent.click(screen.getByLabelText('Select bill W-1 A-101'));
    fireEvent.click(screen.getByLabelText('Select bill W-2 A-102'));
    fireEvent.click(screen.getByRole('button', { name: /Invoice selected \(2\)/ }));

    expect(screen.getByText(/2 bills: one invoice per unit/)).toBeTruthy();
    expect((screen.getByLabelText(/Post now/) as HTMLInputElement).checked).toBe(true);
    fireEvent.change(screen.getByLabelText('Income account'), { target: { value: 'ledger-water' } });
    fireEvent.change(screen.getByLabelText('Invoice date'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create invoices' }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      { bill_ids: ['1', '2'], ledger_account_id: 'ledger-water', invoice_date: '2026-10-01', post_now: true },
      expect.anything(),
    );
  });

  it('selects every pending bill of the page at once', () => {
    render(<BillsTab />);

    fireEvent.click(screen.getByLabelText('Select all pending bills'));

    expect(screen.getByRole('button', { name: /Invoice selected \(2\)/ })).toBeTruthy();
  });

  it('asks for the account before calling the server', () => {
    render(<BillsTab />);
    fireEvent.click(screen.getByLabelText('Select bill W-1 A-101'));
    fireEvent.click(screen.getByRole('button', { name: /Invoice selected/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Create invoices' }));

    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Pick the income account' }));
  });

  it('offers no batch button to a finance reader', () => {
    mocks.canWrite = false;
    render(<BillsTab />);

    expect(screen.queryByRole('button', { name: /Invoice selected/ })).toBeNull();
  });
});
