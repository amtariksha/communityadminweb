import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { depositActionable, RefundableDepositTab } from './deposit-tab';
import { depositAmountError } from './deposit-dialogs';

/** INC-47 — the unit statement's Refundable Deposit tab: list, Refund, Set against dues, by role. */

const mocks = vi.hoisted(() => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    access: { canRead: true, canWrite: true },
    layout: 'classic' as 'classic' | 'standard',
    deposits: { data: [] as unknown[], isLoading: false, error: null as unknown },
    refund: mutation(),
    adjust: mutation(),
    addToast: vi.fn(),
  };
});

vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => mocks.access }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => mocks.layout }));
vi.mock('@/hooks/use-refundable-deposits', () => ({
  useRefundableDeposits: () => mocks.deposits,
  useRefundDeposit: () => mocks.refund,
  useAdjustDeposit: () => mocks.adjust,
}));
vi.mock('@/hooks/use-ledger', () => ({ useLedgerAccounts: () => ({ data: { data: [{ id: 'bank-1', name: 'Bank Account', code: 'bank', is_bank_account: true }] } }) }));
vi.mock('@/components/unit-posting/deposit-form', () => ({ DepositFormView: () => <p>Deposit form dialog</p> }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/lib/date', () => ({ todayIST: () => '2026-10-20' }));

const deposit = (patch: Record<string, unknown> = {}) => ({
  id: 'd-1',
  unit_id: 'u-1',
  unit_number: '101',
  block: 'A',
  receipt_id: 'r-1',
  receipt_number: 'RCT-0040',
  receipt_date: '2026-06-01',
  amount: '25000.00',
  refunded_amount: '0.00',
  adjusted_amount: '5000.00',
  held: '20000.00',
  status: 'held',
  description: 'Fit-out deposit',
  ...patch,
});

describe('Refundable Deposit tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access = { canRead: true, canWrite: true };
    mocks.layout = 'classic';
    mocks.deposits = { data: [deposit(), deposit({ id: 'd-2', receipt_number: 'RCT-0001', held: '0.00', status: 'refunded' })], isLoading: false, error: null };
  });

  it('lists each deposit with what is still held', () => {
    render(<RefundableDepositTab unitId="u-1" />);
    const row = screen.getByText('RCT-0040').closest('tr') as HTMLElement;

    expect(within(row).getByText('₹20,000')).toBeTruthy();
    expect(within(row).getByText('Held')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Post a Refundable Deposit' }).getAttribute('href')).toBe('/income/members/u-1/deposit');
    expect(screen.queryByRole('button', { name: 'Refund RCT-0001' })).toBeNull();
  });

  it('refunds part of a held deposit after confirming', () => {
    render(<RefundableDepositTab unitId="u-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Refund RCT-0040' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '15000' } });
    fireEvent.click(screen.getByLabelText('Cheque'));
    fireEvent.change(screen.getByLabelText('Payment Number'), { target: { value: '889900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Refund ₹15,000' }));

    expect(mocks.refund.mutate).toHaveBeenCalledWith(
      { id: 'd-1', amount: 15000, date: '2026-10-20', mode: 'cheque', bank_account_id: null, reference_number: '889900', notes: null },
      expect.anything(),
    );
  });

  it('sets a deposit against dues and shows what the server refused', () => {
    mocks.adjust.mutate.mockImplementation((_input: unknown, options: { onError: (error: unknown) => void }) =>
      options.onError(new ApiError(400, { message: 'The unit owes ₹3000; at most that much of the deposit can be set against its dues.', code: 'adjust_exceeds_dues' } as never)),
    );
    render(<RefundableDepositTab unitId="u-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Set RCT-0040 against dues' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set ₹20,000 against dues' }));

    expect(mocks.adjust.mutate).toHaveBeenCalledWith({ id: 'd-1', amount: 20000, date: '2026-10-20', notes: null }, expect.anything());
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ description: 'The unit owes ₹3000; at most that much of the deposit can be set against its dues.' }));
  });

  it('refuses more than is held before asking the server', () => {
    expect(depositAmountError('20000.01', '20000.00')).toMatch(/At most/);
    expect(depositAmountError('0', '20000.00')).toMatch(/above zero/);
    expect(depositAmountError('20000', '20000.00')).toBeNull();
    expect(depositActionable({ status: 'partly_refunded', held: '10.00' })).toBe(true);
    expect(depositActionable({ status: 'voided', held: '10.00' })).toBe(false);
  });

  it('leaves a finance reader the list only', () => {
    mocks.access = { canRead: true, canWrite: false };
    render(<RefundableDepositTab unitId="u-1" />);

    expect(screen.queryByRole('button', { name: /Refund/ })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Post a Refundable Deposit' })).toBeNull();
  });

  it('opens the deposit form as a dialog in standard', () => {
    mocks.layout = 'standard';
    render(<RefundableDepositTab unitId="u-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Post a Refundable Deposit' }));
    expect(screen.getByText('Deposit form dialog')).toBeTruthy();
  });

  it('says deposits are not available yet when the route is missing', () => {
    mocks.deposits = { data: [], isLoading: false, error: new ApiError(404, { message: 'Cannot GET' } as never) };
    render(<RefundableDepositTab unitId="u-1" />);

    expect(screen.getByText('Refundable deposits are not available yet on this server.')).toBeTruthy();
  });
});
