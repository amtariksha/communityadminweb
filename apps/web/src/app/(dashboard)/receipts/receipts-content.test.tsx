import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReceiptsContent from './receipts-content';

/**
 * INC-03 — the Record Receipt dialog sent no allocations, so the API
 * booked every rupee as a member advance and paid invoices stayed
 * unpaid. The dialog now asks for FIFO allocation and says where the
 * money went; a finance user can also push stranded advances onto
 * open invoices from this page.
 */

const mocks = vi.hoisted(() => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false, error: null });
  return {
    addToast: vi.fn(),
    createReceipt: mutation(),
    applyAdvances: mutation(),
    other: mutation(),
    advances: [] as Array<{ unit_id: string; remaining: string }>,
    user: null as null | {
      isSuperAdmin: boolean;
      role: string;
      societies: Array<{ id: string; role: string }>;
    },
  };
});

vi.mock('@/hooks', () => ({
  useReceipts: () => ({ data: { data: [], total: 0 }, isLoading: false }),
  useReceiptSummary: () => ({ data: undefined, isLoading: false }),
  useCreateReceipt: () => mocks.createReceipt,
  useCreateCreditNote: () => mocks.other,
  useCreditNotes: () => ({ data: { data: [] } }),
  downloadCreditNotePdf: vi.fn(),
  downloadReceiptPdf: vi.fn(),
  useFinancialYears: () => ({ data: [{ id: 'fy-1', is_current: true }] }),
  useInvoices: () => ({ data: { data: [] } }),
  useUnits: () => ({ data: { data: [{ id: 'unit-1', unit_number: 'A-101' }] } }),
  useAdvances: () => ({ data: { data: mocks.advances }, isLoading: false }),
  useApplyAdvancesFifo: () => mocks.applyAdvances,
}));

vi.mock('@/hooks/use-list-url-state', () => ({
  useListUrlState: () => ({
    state: { page: 1, sort: null, dir: 'desc' },
    setPage: vi.fn(),
  }),
}));

vi.mock('@/lib/auth', () => ({
  getToken: () => 'token',
  getCurrentTenant: () => 'tenant-1',
  getUser: () => mocks.user,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: mocks.addToast }),
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));

vi.mock('@/components/ui/unit-search-select', () => ({
  UnitSearchSelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="Unit" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Pick</option>
      <option value="unit-1">A-101</option>
    </select>
  ),
}));

vi.mock('@/components/ui/export-button', () => ({ ExportButton: () => null }));
vi.mock('./direct-income-dialog', () => ({ DirectIncomeDialog: () => null }));

function signInAs(role: string): void {
  mocks.user = {
    isSuperAdmin: false,
    role,
    societies: [{ id: 'tenant-1', role }],
  };
}

function openDialog(button: RegExp, title: string): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: button }));
  const heading = screen.getByRole('heading', { name: title });
  return heading.closest('dialog') as HTMLElement;
}

function recordReceipt(amount: string): void {
  const dialog = openDialog(/record receipt/i, 'Record Receipt');
  fireEvent.change(within(dialog).getByLabelText('Unit'), { target: { value: 'unit-1' } });
  fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: amount } });
  fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2026-10-17' } });
  fireEvent.submit(within(dialog).getByRole('button', { name: 'Record Receipt' }));
}

describe('ReceiptsContent — Record Receipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAs('accountant');
  });

  it('asks the API to settle the oldest invoices first', () => {
    render(<ReceiptsContent />);
    recordReceipt('1500');

    expect(mocks.createReceipt.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.createReceipt.mutate.mock.calls[0][0]).toMatchObject({
      unit_id: 'unit-1',
      amount: 1500,
      allocation_mode: 'fifo',
    });
  });

  it('says how much went to invoices and how much is held as advance', () => {
    mocks.createReceipt.mutate.mockImplementation((input, options) => {
      options.onSuccess(
        {
          data: {
            id: 'r-1',
            allocations: [
              { invoice_id: 'inv-1', amount: '1000.00' },
              { invoice_id: 'inv-2', amount: '500.00' },
            ],
          },
        },
        input,
      );
    });

    render(<ReceiptsContent />);
    recordReceipt('2000');

    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        description: 'Allocated ₹1,500 to 2 invoices; ₹500 held as advance',
      }),
    );
  });

  it('stays truthful against an API that ignores allocation_mode', () => {
    mocks.createReceipt.mutate.mockImplementation((input, options) => {
      options.onSuccess({ data: { id: 'r-1', allocations: [] } }, input);
    });

    render(<ReceiptsContent />);
    recordReceipt('1500');

    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Allocated ₹0 to 0 invoices; ₹1,500 held as advance',
      }),
    );
  });
});

describe('ReceiptsContent — Apply advances to open invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.advances = [
      { unit_id: 'u1', remaining: '300.00' },
      { unit_id: 'u1', remaining: '200.00' },
      { unit_id: 'u2', remaining: '1000.00' },
    ];
  });

  it.each(['community_admin', 'committee_member', 'accountant'])(
    'is offered to a %s',
    async (role) => {
      signInAs(role);
      render(<ReceiptsContent />);

      expect(
        await screen.findByRole('button', { name: /apply advances to open invoices/i }),
      ).toBeTruthy();
    },
  );

  it.each(['auditor', 'moderator'])('is hidden from a %s', async (role) => {
    signInAs(role);
    render(<ReceiptsContent />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Receipts' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: /apply advances to open invoices/i })).toBeNull();
  });

  it('confirms with the number of units holding unapplied advances, then applies', async () => {
    signInAs('accountant');
    mocks.applyAdvances.mutate.mockImplementation((input, options) => {
      options.onSuccess({ data: { units_processed: 2, amount_applied: 1200, units_failed: 0 } }, input);
    });

    render(<ReceiptsContent />);
    await screen.findByRole('button', { name: /apply advances to open invoices/i });
    const dialog = openDialog(/apply advances to open invoices/i, 'Apply advances to open invoices');

    expect(within(dialog).getByText(/2 units hold ₹1,500 in unapplied advances/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /^apply advances$/i }));

    expect(mocks.applyAdvances.mutate).toHaveBeenCalledWith({}, expect.anything());
    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        description: 'Applied ₹1,200 to open invoices across 2 units.',
      }),
    );
  });
});
