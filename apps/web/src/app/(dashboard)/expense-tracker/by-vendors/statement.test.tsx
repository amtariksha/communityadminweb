import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { VendorStatementContent } from '@/app/(dashboard)/purchases/vendor-ledger/vendor-statement-content';
import { VendorPayablesContent } from '@/app/(dashboard)/purchases/vendor-ledger/vendor-payables-content';

/**
 * EXP-15 — the statement's tabs carry their figures and the full statement
 * shows opening balance, rows, totals and Net payable. EXP-16 — By Vendors
 * shows Total Payables and searches in the chosen field.
 */

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => 'accountant' }));
vi.mock('@/app/(dashboard)/purchases/vendor-ledger/reverse-dialog', () => ({ ReverseDialog: () => null }));
vi.mock('@/components/data-table/export-strip', () => ({ ExportStrip: () => null }));

const mocks = vi.hoisted(() => ({ payablesFilters: [] as unknown[] }));

vi.mock('@/hooks/use-vendor-ledger', () => ({
  statementParams: () => ({}),
  useVendorStatement: () => ({
    isFetching: false,
    data: {
      vendor: { id: 'v1', name: 'Clearwater Tanks' },
      from: '2026-06-01',
      to: '2026-06-30',
      opening_balance: '1000.00',
      rows: [
        { line_id: 'l1', entry_id: 'e1', entry_date: '2026-06-05', voucher_number: 'BILL-00002', posted_by_name: 'Treasurer', invoice_date: '2026-06-05', vendor_invoice_number: 'CW-1', expense_heads: 'Repair Expense', comments: null, due: '5000.00', payment: '0.00', kind: 'invoice', source_id: 'b1', is_reversal: false, is_reversed: false, can_reverse: false, can_edit: false },
        { line_id: 'l2', entry_id: 'e2', entry_date: '2026-06-20', voucher_number: 'PV-00001', posted_by_name: 'Treasurer', invoice_date: null, vendor_invoice_number: null, expense_heads: null, comments: null, due: '0.00', payment: '4000.00', kind: 'payment', source_id: 'p1', is_reversal: false, is_reversed: false, can_reverse: true, can_edit: false },
      ],
      totals: { due: '5000.00', payment: '4000.00' },
      net: '2000.00',
      current_dues: { amount: '2000.00', rows: [] },
      current_advance: { amount: '250.00', rows: [] },
    },
  }),
  useVendorPayables: (filters: unknown) => {
    mocks.payablesFilters.push(filters);
    return {
      isLoading: false,
      error: null,
      data: { data: [{ vendor_id: 'v1', vendor_code: null, name: 'Alpha Electricals', is_active: true, balance: '1000.00' }], total: 1, total_payables: '3500.00' },
    };
  },
  useAutoAllocate: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('Vendor account statement', () => {
  it('labels Current Dues and Current Advance with their figures', () => {
    render(<VendorStatementContent vendorId="v1" />);
    expect(screen.getByRole('tab', { name: /Current Dues \(₹2,000\)/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Current Advance \(₹250\)/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Full Account Statement' })).toBeTruthy();
  });

  it('shows the full statement with opening balance, totals, Net payable and Reverse on the payment', () => {
    render(<VendorStatementContent vendorId="v1" initialTab="full" />);
    expect(screen.getByText(/Opening balance/).textContent).toContain('1,000');
    expect(screen.getByText('CW-1')).toBeTruthy();
    expect(screen.getByTestId('net-payable').textContent).toContain('2,000');
    expect(screen.getAllByRole('button', { name: 'Reverse' })).toHaveLength(1);
  });
});

describe('By Vendors', () => {
  it('shows Total Payables and searches in the field chosen', () => {
    render(<VendorPayablesContent />);
    expect(screen.getByTestId('total-payables').textContent).toContain('3,500');
    fireEvent.change(screen.getByLabelText('Search text'), { target: { value: 'alpha' } });
    fireEvent.click(screen.getByLabelText('Vendor Name'));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(mocks.payablesFilters[mocks.payablesFilters.length - 1]).toMatchObject({ search: 'alpha', searchIn: 'vendor_name', page: 1 });
    expect(screen.getByRole('link', { name: 'Invoice' }).getAttribute('href')).toBe('/expense-tracker/by-vendors/v1/invoice');
  });
});
