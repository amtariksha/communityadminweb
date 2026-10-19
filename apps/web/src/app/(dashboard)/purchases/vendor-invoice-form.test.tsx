import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VendorInvoiceForm } from './vendor-invoice/vendor-invoice-form';

/**
 * EXP-12 — Post vendor invoice: the vendor's defaults (VEND-05) fill line 1
 * and the TDS block; a line cannot carry CGST/SGST and IGST together; the
 * body sent is the multi-line invoice; the entries panel shows what the
 * server's preview computed for the form as it stands.
 */

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T) => value }));
vi.mock('@/hooks/use-ocr', () => ({ useOcrInvoice: () => ({ mutateAsync: vi.fn(), isPending: false }) }));

const HEAD = 'head-amc-lift';
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  previewInputs: [] as unknown[],
}));
const vendor = vi.hoisted(() => ({
  id: 'vendor-1',
  name: 'Skyline Lifts',
  default_expense_account_id: 'head-amc-lift',
  default_cgst_rate: '9.00',
  default_sgst_rate: '9.00',
  default_igst_rate: null,
  tds_section: '393(1)',
  tds_rate: 2,
  payee_name: 'Skyline Lift Services',
}));

vi.mock('@/hooks', () => ({
  useVendor: (id: string) => ({ data: id === vendor.id ? vendor : undefined }),
  useVendors: () => ({ data: { data: [vendor], total: 1 } }),
  useTdsConfig: () => ({ data: { config: { sections: [{ code: '393(1)', label: 'Contractors', threshold: 0, rate: 2 }] } } }),
}));

vi.mock('@/hooks/use-vendor-bills', () => ({
  useInvoiceHeads: () => ({
    data: {
      data: [
        { ledger_account_id: 'head-amc-lift', code: 'EX10', name: 'AMC - Lift', hsn_sac: '998719' },
        { ledger_account_id: 'head-garden', code: 'EX11', name: 'Garden Upkeep', hsn_sac: null },
      ],
      gst: { society_state_code: '29', rate_options: [0, 5, 18, 40], pre_reform_rates: [12, 28], reform_date: '2025-09-22' },
    },
  }),
  useCreateVendorInvoice: () => ({ mutate: mocks.create, isPending: false }),
  useBillPreview: (input: unknown) => {
    mocks.previewInputs.push(input);
    const taxable = (input as { lines?: Array<{ taxable_amount: number }> } | null)?.lines?.reduce((s, l) => s + l.taxable_amount, 0) ?? 0;
    return {
      isFetching: false,
      error: null,
      data: input
        ? {
            lines: [],
            entries: [{ ledger_account_id: HEAD, account_code: 'EX10', account_name: 'AMC - Lift', debit: taxable, credit: 0 }],
            totals: { taxable, cgst: 0, sgst: 0, igst: 0, gst: 0, grand_total: taxable, tds: 0, payable: taxable },
            claimable: true,
            duplicate_invoice_number: false,
          }
        : undefined,
    };
  },
}));

function renderPage(): void {
  render(<VendorInvoiceForm mode="page" vendorId={vendor.id} onClose={vi.fn()} onSaved={vi.fn()} />);
}

const field = (label: string | RegExp): HTMLInputElement => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string | RegExp, value: string): void => {
  fireEvent.change(field(label), { target: { value } });
};

describe('Post vendor invoice', () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.previewInputs.length = 0;
  });

  it('fills line 1 with the vendor\'s head and CGST/SGST rate, and TDS with its section and rate', () => {
    renderPage();
    expect(field('Line 1 expense head').value).toBe(HEAD);
    expect(field('Line 1 HSN/SAC').value).toBe('998719');
    expect(field('Line 1 CGST/SGST rate').value).toBe('18');
    expect(field('Line 1 IGST rate').value).toBe('');
    expect(field('Value').value).toBe('2');
    expect(field(/^Section/).value).toBe('393(1)');
    expect(field('Payee Name').value).toBe('Skyline Lift Services');
    expect(screen.getAllByLabelText(/expense head$/)).toHaveLength(7);
  });

  it('refuses a line with both a CGST/SGST rate and an IGST rate', async () => {
    renderPage();
    type('Invoice No *', 'SL-55');
    type('Line 1 amount', '1000');
    type('Line 1 IGST rate', '18');

    expect(screen.getAllByText('Choose CGST/SGST or IGST').length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Post Entries' }));
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('sends the multi-line invoice body', async () => {
    renderPage();
    type('Invoice No *', 'SL-55');
    type('Invoice date *', '2026-10-05');
    type('Line 1 amount', '10000');
    type('Line 2 expense head', 'head-garden');
    type('Line 2 amount', '5000');
    type('Line 2 IGST rate', '18');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Post Entries' }));
    });

    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0]).toEqual({
      vendor_id: vendor.id,
      vendor_invoice_number: 'SL-55',
      bill_date: '2026-10-05',
      due_date: '2026-11-04',
      lines: [
        { ledger_account_id: HEAD, description: null, hsn_sac: '998719', taxable_amount: 10000, gst_type: 'cgst_sgst', gst_rate: 18 },
        { ledger_account_id: 'head-garden', description: null, hsn_sac: null, taxable_amount: 5000, gst_type: 'igst', gst_rate: 18 },
      ],
      tds: { basis: 'percent_excl_gst', value: 2, section: '393(1)' },
      payee_name: 'Skyline Lift Services',
    });
  });

  it('asks the server again when an amount changes, and shows its totals', () => {
    renderPage();
    type('Invoice No *', 'SL-55');
    type('Line 1 amount', '1000');
    expect(screen.getByTestId('total-taxable').textContent).toContain('1,000');

    type('Line 1 amount', '2500');
    expect(screen.getByTestId('total-taxable').textContent).toContain('2,500');
    const last = mocks.previewInputs[mocks.previewInputs.length - 1] as { lines: Array<{ taxable_amount: number }> };
    expect(last.lines[0].taxable_amount).toBe(2500);
  });

  it('previews nothing while the form cannot post', () => {
    renderPage();
    expect(mocks.previewInputs.every((input) => input === null)).toBe(true);
    expect(screen.getByText('Fill the invoice to see its entries.')).toBeTruthy();
  });
});

