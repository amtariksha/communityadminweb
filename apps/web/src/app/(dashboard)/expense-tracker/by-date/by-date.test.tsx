import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentRegisterContent } from '@/app/(dashboard)/purchases/vendor-ledger/payment-register-content';
import { numberingChanges } from '@/app/(dashboard)/purchases/vendor-ledger/numbering-form';

/**
 * EXP-17 — the register opens empty behind the fetch panel (classic), then
 * lists vouchers: Reverse on a live payment, "Reversed" and "Reversal of
 * PV-…" on the pair; Suppress Reversals goes to the API. EXP-18 — a next
 * number at or below the last issued is refused.
 */

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => 'accountant' }));
vi.mock('@/lib/auth', () => ({ getCurrentTenant: () => 't1', getUser: () => ({ societies: [{ id: 't1', name: 'Green Meadows' }] }) }));
vi.mock('@/app/(dashboard)/purchases/vendor-ledger/reverse-dialog', () => ({ ReverseDialog: () => null }));
vi.mock('@/components/data-table/export-strip', () => ({ ExportStrip: () => null }));

const mocks = vi.hoisted(() => ({ calls: [] as Array<{ filters: Record<string, unknown>; enabled: boolean }> }));
const row = (over: Record<string, unknown>) => ({
  id: 'p1', voucher_number: 'PV-00001', payment_date: '2026-10-05', posted_by_name: 'Treasurer', vendor_id: 'v1', vendor_name: 'Omega Lifts',
  invoices: 'OL-1', amount: '1200.00', write_off_amount: '0.00', account_name: 'Omega Lifts', reference_number: '000123', instrument_date: '2026-10-05',
  bank_ledger: 'bank Bank Account', notes: null, is_reversed: false, is_reversal: false, reversal_of: null, kind: 'against_invoice', ...over,
});

vi.mock('@/hooks/use-vendor-ledger', () => ({
  registerParams: (f: Record<string, unknown>) => f,
  usePaymentRegister: (filters: Record<string, unknown>, enabled: boolean) => {
    mocks.calls.push({ filters, enabled });
    return {
      isLoading: false,
      isFetching: false,
      error: null,
      data: enabled
        ? {
            data: [
              row({ id: 'p2', voucher_number: 'PV-00002', notes: 'Quarterly AMC', invoice_comments: 'OL-1: first quarter' }),
              row({ id: 'p1', voucher_number: 'REV-PV-00001', is_reversed: true, is_reversal: true, reversal_of: 'PV-00001' }),
              row({ id: 'p1', is_reversed: true }),
            ],
            total: 3,
          }
        : undefined,
    };
  },
}));

describe('Expenses By Date', () => {
  it('opens empty in classic, then shows the vouchers once fetched', () => {
    render(<PaymentRegisterContent fetchFirst />);
    expect(screen.getByText('Green Meadows — Expenses By Date')).toBeTruthy();
    expect(mocks.calls[mocks.calls.length - 1].enabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));

    expect(screen.getAllByRole('button', { name: 'Reverse' })).toHaveLength(1);
    expect(screen.getByText('Reversal of PV-00001')).toBeTruthy();
    expect(screen.getByText('Reversed')).toBeTruthy();
    expect(screen.getByText('Quarterly AMC · OL-1: first quarter')).toBeTruthy();
  });

  it('sends Suppress Reversals to the API', () => {
    render(<PaymentRegisterContent fetchFirst={false} />);
    fireEvent.click(screen.getByLabelText('Suppress Reversals'));
    expect(mocks.calls[mocks.calls.length - 1].filters).toMatchObject({ suppressReversals: true, page: 1 });
  });
});

describe('Numbering', () => {
  const rows = [{ key: 'next_voucher_number' as const, label: 'Voucher', prefix: 'PV-', last_issued: 41, next: 42 }];

  it('refuses a next number at or below the last one issued', () => {
    expect(numberingChanges(rows, { next_voucher_number: '41' })).toEqual({ body: {}, error: 'Next number must be greater than 41' });
  });

  it('sends only what changed', () => {
    expect(numberingChanges(rows, { next_voucher_number: '42' })).toEqual({ body: {}, error: null });
    expect(numberingChanges(rows, { next_voucher_number: '100' })).toEqual({ body: { next_voucher_number: 100 }, error: null });
  });
});
