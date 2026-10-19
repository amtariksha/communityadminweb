import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatementFilters, UnitStatement } from '@/hooks/use-unit-statement';
import { StatementContent } from './statement-content';

/**
 * INC-22 — the Account Statement screen: tab figures, the filter row, the
 * Actions menu by role, Reverse with a reason, Edit of the words only,
 * Export and Auto Allocate.
 */

const mocks = vi.hoisted(() => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    tab: null as string | null,
    access: { canRead: true, canWrite: true },
    calls: [] as StatementFilters[],
    statement: null as unknown,
    cancel: mutation(),
    voidReceipt: mutation(),
    waive: mutation(),
    reallocate: mutation(),
    editInvoice: mutation(),
    editReceipt: mutation(),
    download: vi.fn().mockResolvedValue(new Blob(['x'])),
    addToast: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/income/members/u-1/statement',
  useSearchParams: () => ({ get: () => mocks.tab }),
}));
vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => mocks.access }));
vi.mock('@/hooks/use-unit-statement', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-unit-statement')>()),
  useUnitStatement: (_unitId: string, filters: StatementFilters) => {
    mocks.calls.push(filters);
    return { data: mocks.statement, error: null, refetch: vi.fn() };
  },
  useOpenBills: () => ({ data: [], isLoading: false, error: null }),
  useAllocations: () => ({ data: { links: [] }, isLoading: false, error: null }),
  useReallocateFifo: () => mocks.reallocate,
  useEditInvoiceDetails: () => mocks.editInvoice,
  useEditReceiptDetails: () => mocks.editReceipt,
}));
vi.mock('@/hooks/use-invoices', () => ({
  useCancelInvoice: () => mocks.cancel,
  useWaiveInterest: () => mocks.waive,
  useInvoice: () => ({ data: { due_date: '2026-10-11', comment: null } }),
}));
vi.mock('@/hooks/use-receipts', () => ({
  useReceipt: () => ({ data: { reference_number: 'CHQ-1', payment_bank: null, notes: null } }),
  useAdvances: () => ({ data: { data: [] }, isLoading: false }),
}));
vi.mock('@/hooks/use-receipt-void', () => ({ useVoidReceipt: () => mocks.voidReceipt }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/lib/api', () => ({ api: { download: mocks.download } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn() }));

function statement(): UnitStatement {
  return {
    unit: { id: 'u-1', unit_number: '101', block: 'A' },
    from: '2026-04-01',
    to: '2026-10-19',
    scope: 'member',
    view: 'admin',
    show_reversals: false,
    summary: { current_due: 2060, current_advances: 150, refundable_deposit: 0 },
    opening: 3000,
    rows: [
      {
        doc_type: 'invoice',
        doc_id: 'inv-1',
        date: '2026-10-01',
        posted_by: 'Treasurer',
        invoice_id: 'inv-1',
        invoice_no: 'INV-0002',
        receipt_no: null,
        account: 'Maintenance',
        description: 'Oct 2026',
        due: 3000,
        paid: 0,
        balance: 6000,
        reversal: false,
        actions: ['reverse', 'edit', 'view_allocation'],
      },
      {
        doc_type: 'receipt',
        doc_id: 'rct-1',
        date: '2026-10-10',
        posted_by: 'Treasurer',
        invoice_id: null,
        invoice_no: null,
        receipt_no: 'RCT-0001',
        account: 'Bank Account',
        description: 'Cheque CHQ-1',
        due: 0,
        paid: 3940,
        balance: 2060,
        reversal: false,
        actions: ['reverse', 'edit', 'view_allocation'],
      },
    ],
    totals: { due: 3000, paid: 3940, net: 2060 },
  };
}

function renderPage(): void {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  render(<StatementContent unitId="u-1" />, { wrapper });
}

function openRowMenu(name: string): void {
  fireEvent.click(screen.getByRole('button', { name: `Actions for ${name}` }));
}

describe('Account Statement screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tab = null;
    mocks.access = { canRead: true, canWrite: true };
    mocks.calls = [];
    mocks.statement = statement();
  });

  it('shows the figures on the tabs and opens on the admin statement', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Account Statement for A-101' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Current Due (₹2,060)' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Current Advances (₹150)' })).toBeTruthy();
    expect(screen.getByRole('link', { name: "Admin's Account Statement" }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Opening balance')).toBeTruthy();
    expect(screen.getByText('Net')).toBeTruthy();
  });

  it('asks the server for reversals when ticked and submitted', () => {
    renderPage();

    fireEvent.click(screen.getByLabelText('Show Reversals'));
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(mocks.calls[mocks.calls.length - 1]).toMatchObject({ from: '2026-10-01', showReversals: true, view: 'admin' });
  });

  it("shows the user's statement without reversals", () => {
    mocks.tab = 'user';
    renderPage();

    expect(mocks.calls[mocks.calls.length - 1]).toMatchObject({ view: 'resident', showReversals: false });
    expect(screen.queryByLabelText('Show Reversals')).toBeNull();
  });

  it('reverses an invoice with the reason given', () => {
    renderPage();

    openRowMenu('INV-0002');
    fireEvent.click(screen.getByText('Reverse'));
    const dialog = screen.getByRole('heading', { name: 'Reverse invoice INV-0002' }).closest('dialog') as HTMLElement;
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Raised on the wrong flat' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reverse invoice' }));

    expect(mocks.cancel.mutate).toHaveBeenCalledWith({ id: 'inv-1', reason: 'Raised on the wrong flat' }, expect.anything());
  });

  it('voids a receipt through Reverse', () => {
    renderPage();

    openRowMenu('RCT-0001');
    fireEvent.click(screen.getByText('Reverse'));
    const dialog = screen.getByRole('heading', { name: 'Reverse receipt RCT-0001' }).closest('dialog') as HTMLElement;
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Bounced' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reverse receipt' }));

    expect(mocks.voidReceipt.mutate).toHaveBeenCalledWith({ receiptId: 'rct-1', reason: 'Bounced' }, expect.anything());
  });

  it('edits only the payment number, bank and comments of a receipt', () => {
    renderPage();

    openRowMenu('RCT-0001');
    fireEvent.click(screen.getByText('Edit'));
    const dialog = screen.getByRole('heading', { name: 'Edit RCT-0001' }).closest('dialog') as HTMLElement;
    expect(within(dialog).queryByLabelText(/amount/i)).toBeNull();
    fireEvent.change(within(dialog).getByLabelText('Payment Bank'), { target: { value: 'Test Bank' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(mocks.editReceipt.mutate).toHaveBeenCalledWith(
      { id: 'rct-1', reference_number: 'CHQ-1', payment_bank: 'Test Bank', notes: null },
      expect.anything(),
    );
  });

  it('leaves a finance reader View Allocation only, and no Auto Allocate', () => {
    mocks.access = { canRead: true, canWrite: false };
    renderPage();

    openRowMenu('INV-0002');
    expect(screen.queryByText('Reverse')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
    expect(screen.getByText('View Allocation')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Auto Allocate on FiFo Basis' })).toBeNull();
  });

  it('exports every row and re-allocates after confirming', () => {
    renderPage();

    expect(screen.getByText('Export rows 1–5:')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    expect(mocks.download).toHaveBeenCalledWith('/unit-ledger/units/u-1/statement', {
      params: expect.objectContaining({ format: 'csv', view: 'admin' }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Auto Allocate on FiFo Basis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Re-allocate' }));
    expect(mocks.reallocate.mutate).toHaveBeenCalledWith({ unitId: 'u-1', scope: 'member' }, expect.anything());
  });
});
