import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VendorPaymentForm } from './vendor-payment/vendor-payment-form';
import { allocations, amountPaid, writeOffLimit } from './vendor-payment/payment-model';

/**
 * EXP-14 — Pay a vendor: Select All fills each Edit Amount with what
 * remains; the instrument number is required unless paid in cash; Post
 * advance payment hides the invoices and posts an advance; a write-off
 * settles what the edited amounts leave on the ticked invoices.
 */

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('../debit-note-dialog', () => ({ DebitNoteDialog: () => null }));
vi.mock('./debit-note-dialog', () => ({ DebitNoteDialog: () => null }));

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
const bills = vi.hoisted(() => [
  { id: 'b1', bill_number: 'BILL-00001', vendor_invoice_number: 'SL-1', bill_date: '2026-09-01', due_date: '2026-10-01', payee_name: null, status: 'overdue', heads: 'AMC - Lift', invoice_amount: '5000.00', remaining: '5000.00', tds_amount: '0.00' },
  { id: 'b2', bill_number: 'BILL-00002', vendor_invoice_number: 'SL-2', bill_date: '2026-09-15', due_date: '2026-10-15', payee_name: null, status: 'received', heads: 'AMC - Lift', invoice_amount: '3000.00', remaining: '3000.00', tds_amount: '0.00' },
]);

vi.mock('@/hooks', () => ({
  useVendor: () => ({ data: { id: 'vendor-1', name: 'Skyline Lifts' } }),
  useLedgerAccounts: (filters: { account_type: string[] }) => ({
    data: {
      data: filters.account_type[0] === 'asset'
        ? [{ id: 'bank-ledger', code: 'bank', name: 'HDFC Current', is_bank_account: true }, { id: 'cash-ledger', code: 'cash', name: 'Cash in Hand', is_bank_account: false }]
        : [{ id: 'discount', code: 'INC9', name: 'Discount Received', is_bank_account: false }],
    },
  }),
}));
vi.mock('@/hooks/use-vendor-bills', () => ({ useInvoiceHeads: () => ({ data: { data: [{ ledger_account_id: 'head-1', code: 'EX10', name: 'AMC - Lift', hsn_sac: null }] } }) }));
vi.mock('@/hooks/use-vendor-payments', () => ({
  useVendorOpenItems: () => ({ data: { bills, credits: [], totals: { dues: '8000.00', advance: '0.00' } } }),
  useCreateVendorPayment: () => ({ mutate: mocks.create, isPending: false }),
}));

const field = (label: string | RegExp): HTMLInputElement => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string | RegExp, value: string): void => {
  fireEvent.change(field(label), { target: { value } });
};
const post = async (): Promise<void> => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Post Payment' }));
  });
};

describe('Pay a vendor', () => {
  beforeEach(() => mocks.create.mockReset());

  function renderForm(): void {
    render(<VendorPaymentForm mode="page" vendorId="vendor-1" onClose={vi.fn()} onSaved={vi.fn()} />);
  }

  it('Select All puts what remains into each Edit Amount, and Amount paid is their sum', () => {
    renderForm();
    fireEvent.click(screen.getByLabelText('Select All'));
    expect(field('Amount for SL-1').value).toBe('5000.00');
    expect(field('Amount for SL-2').value).toBe('3000.00');
    expect(screen.getByTestId('amount-paid').textContent).toContain('8,000');
  });

  it('an edited amount can be lowered but not raised above what remains', () => {
    renderForm();
    fireEvent.click(screen.getByLabelText('Pay SL-2'));
    type('Amount for SL-2', '9999');
    expect(field('Amount for SL-2').value).toBe('3000.00');
    type('Amount for SL-2', '1000');
    expect(field('Amount for SL-2').value).toBe('1000');
  });

  it('needs an instrument number unless paid in cash', async () => {
    renderForm();
    fireEvent.click(screen.getByLabelText('Pay SL-1'));
    type('Paid from *', 'bank-ledger');
    await post();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/instrument number/i);

    type('Payment mode *', 'cash');
    await post();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ kind: 'against_invoice', payment_mode: 'cash', amount: 5000, allocations: [{ bill_id: 'b1', amount: 5000 }] });
  });

  it('Post advance payment hides the invoices and posts an advance', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Post advance payment' }));
    expect(screen.queryByLabelText('Select All')).toBeNull();
    type('Paid from *', 'bank-ledger');
    type('Instrument No *', 'UTR998877');
    type('Amount *', '2000');
    await post();
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ kind: 'advance', amount: 2000, allocations: [], instrument_number: 'UTR998877' });
  });

  it('a write-off settles the shortfall on the ticked invoices and TDS comes out of the amount paid', async () => {
    renderForm();
    fireEvent.click(screen.getByLabelText('Select All'));
    type('Amount for SL-1', '4990');
    type('Paid from *', 'bank-ledger');
    type('Instrument No *', 'CHQ0042');
    type('Write-off', '10');
    type('Write-off account', 'discount');
    type('TDS at payment', '100');
    await post();
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      amount: 7890,
      tds_amount: 100,
      write_off_amount: 10,
      write_off_account_id: 'discount',
      allocations: [{ bill_id: 'b1', amount: 5000 }, { bill_id: 'b2', amount: 3000 }],
    });
  });
});

describe('payment arithmetic', () => {
  const rows = { b1: { ticked: true, amount: '4000' }, b2: { ticked: true, amount: '2500' } };

  it('works out the amount paid, the write-off limit and the allocations', () => {
    expect(amountPaid(bills, rows, '100')).toBe(640_000);
    expect(writeOffLimit(bills, rows)).toBe(150_000);
    expect(allocations(bills, rows, '1200')).toEqual([{ bill_id: 'b1', amount: 5000 }, { bill_id: 'b2', amount: 2700 }]);
  });
});
