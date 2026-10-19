import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import ReceiptsContent from './receipts-content';

/**
 * INC-27 — a finance writer can void a receipt from the history table; a
 * voided receipt shows as Voided and offers no second void; online payments
 * are refunded through the gateway, so they offer none either.
 */

const mocks = vi.hoisted(() => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false, error: null });
  return {
    addToast: vi.fn(),
    voidReceipt: mutation(),
    other: mutation(),
    receipts: [] as Array<Record<string, unknown>>,
    user: null as null | { isSuperAdmin: boolean; role: string; societies: Array<{ id: string; role: string }> },
  };
});

vi.mock('@/hooks', () => ({
  useReceipts: () => ({ data: { data: mocks.receipts, total: mocks.receipts.length }, isLoading: false }),
  useReceiptSummary: () => ({ data: undefined, isLoading: false }),
  useCreateReceipt: () => mocks.other,
  useCreateCreditNote: () => mocks.other,
  useCreditNotes: () => ({ data: { data: [] } }),
  downloadCreditNotePdf: vi.fn(),
  downloadReceiptPdf: vi.fn(),
  useFinancialYears: () => ({ data: [{ id: 'fy-1', is_current: true }] }),
  useInvoices: () => ({ data: { data: [] } }),
  useUnits: () => ({ data: { data: [{ id: 'unit-1', unit_number: 'A-101' }] } }),
  useAdvances: () => ({ data: { data: [] }, isLoading: false }),
  useApplyAdvancesFifo: () => mocks.other,
}));

vi.mock('@/hooks/use-receipt-void', () => ({ useVoidReceipt: () => mocks.voidReceipt }));

vi.mock('@/hooks/use-list-url-state', () => ({
  useListUrlState: () => ({ state: { page: 1, sort: null, dir: 'desc' }, setPage: vi.fn() }),
}));

vi.mock('@/lib/auth', () => ({
  getToken: () => 'token',
  getCurrentTenant: () => 'tenant-1',
  getUser: () => mocks.user,
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));

vi.mock('@/components/ui/unit-search-select', () => ({ UnitSearchSelect: () => null }));
vi.mock('@/components/ui/export-button', () => ({ ExportButton: () => null }));
vi.mock('./direct-income-dialog', () => ({ DirectIncomeDialog: () => null }));

function signInAs(role: string): void {
  mocks.user = { isSuperAdmin: false, role, societies: [{ id: 'tenant-1', role }] };
}

function receiptRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'rcpt-1',
    receipt_number: 'RCT-0007',
    unit_id: 'unit-1',
    unit_number: 'A-101',
    amount: '5000.00',
    payment_mode: 'cheque',
    receipt_date: '2026-10-16',
    reference_number: 'CHQ-1',
    voided_at: null,
    ...overrides,
  };
}

describe('ReceiptsContent — Void', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.receipts = [receiptRow()];
  });

  it('voids with the reason typed in the confirmation', async () => {
    signInAs('accountant');
    mocks.voidReceipt.mutate.mockImplementation((input, options) => {
      options.onSuccess({
        data: { id: 'rcpt-1', receipt_number: 'RCT-0007', invoices_reopened: [{ id: 'inv-1' }] },
      });
    });
    render(<ReceiptsContent />);

    fireEvent.click(await screen.findByRole('button', { name: /void receipt RCT-0007/i }));
    const dialog = screen.getByRole('heading', { name: 'Void receipt RCT-0007' }).closest('dialog') as HTMLElement;
    const confirm = within(dialog).getByRole('button', { name: 'Void receipt' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Cheque returned unpaid' } });
    fireEvent.click(confirm);

    expect(mocks.voidReceipt.mutate).toHaveBeenCalledWith(
      { receiptId: 'rcpt-1', reason: 'Cheque returned unpaid' },
      expect.anything(),
    );
    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Receipt RCT-0007 is voided; 1 bill open again.' }),
    );
  });

  it('says the action is not available yet when the API has not been deployed', async () => {
    signInAs('community_admin');
    mocks.voidReceipt.mutate.mockImplementation((_input, options) => {
      options.onError(new ApiError(404, { statusCode: 404, message: 'Cannot POST' } as never));
    });
    render(<ReceiptsContent />);

    fireEvent.click(await screen.findByRole('button', { name: /void receipt RCT-0007/i }));
    const dialog = screen.getByRole('heading', { name: 'Void receipt RCT-0007' }).closest('dialog') as HTMLElement;
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Bounced' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Void receipt' }));

    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringMatching(/not available yet/) }),
    );
  });

  it.each(['committee_member', 'auditor'])('is not offered to a %s', async (role) => {
    signInAs(role);
    render(<ReceiptsContent />);

    await waitFor(() => expect(screen.getByText('RCT-0007')).toBeTruthy());
    expect(screen.queryByRole('button', { name: /void receipt/i })).toBeNull();
  });

  it('marks a voided receipt and offers no second void', async () => {
    signInAs('accountant');
    mocks.receipts = [receiptRow({ voided_at: '2026-10-18T09:00:00Z', void_reason: 'Bounced' })];
    render(<ReceiptsContent />);

    expect(await screen.findByText('Voided')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /void receipt/i })).toBeNull();
  });

  it('offers no void on an online payment', async () => {
    signInAs('accountant');
    mocks.receipts = [receiptRow({ payment_mode: 'online' })];
    render(<ReceiptsContent />);

    await waitFor(() => expect(screen.getByText('RCT-0007')).toBeTruthy());
    expect(screen.queryByRole('button', { name: /void receipt/i })).toBeNull();
  });
});
