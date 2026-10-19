import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PRDetail } from '@/hooks/use-purchase-requests';
import { rowsFromRequest } from './from-request';
import { VendorInvoiceForm } from './vendor-invoice-form';

/**
 * EXP-10 — Post vendor invoice opened from an approved purchase request:
 * the request's lines fill the grid (CGST/SGST or IGST rate as on the
 * request), and Post Entries converts the request instead of posting a
 * separate bill.
 */

const mocks = vi.hoisted(() => ({ convert: vi.fn(), create: vi.fn(), detail: null as unknown }));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T) => value }));
vi.mock('@/hooks/use-ocr', () => ({ useOcrInvoice: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock('@/hooks', () => ({
  useVendor: () => ({ data: { id: 'v-1', name: 'Volt Electricals', default_expense_account_id: null } }),
  useVendors: () => ({ data: { data: [], total: 0 } }),
  useTdsConfig: () => ({ data: { config: { sections: [] } } }),
}));
vi.mock('@/hooks/use-vendor-bills', () => ({
  vendorBillKeys: { all: ['vendor-bills'] },
  useInvoiceHeads: () => ({
    data: {
      data: [
        { ledger_account_id: 'h-repair', code: 'EX1', name: 'Repairs', hsn_sac: '998719' },
        { ledger_account_id: 'h-power', code: 'EX2', name: 'Electricity', hsn_sac: null },
      ],
      gst: { society_state_code: '29', rate_options: [0, 5, 18, 40], pre_reform_rates: [12, 28], reform_date: '2025-09-22' },
    },
  }),
  useCreateVendorInvoice: () => ({ mutate: mocks.create, isPending: false }),
  useBillPreview: () => ({ isFetching: false, error: null, data: undefined }),
}));
vi.mock('@/hooks/use-purchase-requests', () => ({
  purchaseRequestKeys: { all: ['purchase-requests'] },
  usePurchaseRequestDetail: () => ({ data: mocks.detail }),
}));
vi.mock('@tanstack/react-query', async (original) => ({
  ...(await original<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: mocks.convert, isPending: false }),
}));

const DETAIL = {
  purchase_request: { id: 'pr-1', pr_number: 'PR-00011', vendor_id: 'v-1' },
  lines: [
    { line_no: 1, ledger_account_id: 'h-repair', description: 'Pump', hsn_sac: '998719', taxable_amount: '1000.00', gst_type: 'cgst_sgst', gst_rate: '18.00' },
    { line_no: 2, ledger_account_id: 'h-power', description: null, hsn_sac: null, taxable_amount: '1000.00', gst_type: 'igst', gst_rate: '18.00' },
    { line_no: 3, ledger_account_id: 'h-power', description: 'Free', hsn_sac: null, taxable_amount: '0.00', gst_type: 'none', gst_rate: '0.00' },
  ],
} as unknown as PRDetail;

describe('Convert to invoice (EXP-10)', () => {
  it('turns the request lines into invoice rows, leaving out lines worth nothing', () => {
    const rows = rowsFromRequest(DETAIL);
    expect(rows.slice(0, 2)).toEqual([
      { head: 'h-repair', description: 'Pump', hsnSac: '998719', amount: '1000', cgstSgstRate: '18', igstRate: '' },
      { head: 'h-power', description: '', hsnSac: '', amount: '1000', cgstSgstRate: '', igstRate: '18' },
    ]);
    expect(rows).toHaveLength(7);
  });

  it('fills the form from the request and posts by converting it', () => {
    mocks.detail = DETAIL;
    render(<VendorInvoiceForm mode="page" vendorId="v-1" fromRequestId="pr-1" onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByText(/from PR-00011/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Invoice No *'), { target: { value: 'INV-77' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post Entries' }));

    expect(mocks.create).not.toHaveBeenCalled();
    const [{ requestId, input }] = mocks.convert.mock.calls[0];
    expect(requestId).toBe('pr-1');
    expect(input).toMatchObject({
      vendor_id: 'v-1',
      vendor_invoice_number: 'INV-77',
      lines: [
        { ledger_account_id: 'h-repair', taxable_amount: 1000, gst_type: 'cgst_sgst', gst_rate: 18, hsn_sac: '998719' },
        { ledger_account_id: 'h-power', taxable_amount: 1000, gst_type: 'igst', gst_rate: 18 },
      ],
    });
  });
});
