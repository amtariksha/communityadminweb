import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DepositFormView } from './deposit-form';

/** INC-47 — Post a Refundable Deposit for a unit. */

const mocks = vi.hoisted(() => ({ take: { mutate: vi.fn(), isPending: false }, addToast: vi.fn() }));

vi.mock('@/hooks/use-refundable-deposits', () => ({ useTakeDeposit: () => mocks.take }));
vi.mock('@/hooks/use-unit-posting', () => ({
  useUnitDuesRow: () => ({ data: { unit_id: 'u-1', unit_number: '101', block: 'A', billing_name: 'Asha Rao', due: '2000.00' } }),
}));
vi.mock('@/hooks/use-units', () => ({ useUnitMembers: () => ({ data: [{ id: 'm-1', member_type: 'owner', name: 'Asha Rao' }] }) }));
vi.mock('@/hooks/use-ledger', () => ({ useLedgerAccounts: () => ({ data: { data: [] } }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

const renderForm = () => render(<DepositFormView unitId="u-1" mode="page" today="2026-10-20" onClose={vi.fn()} onPosted={vi.fn()} />);

describe('DepositFormView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts the deposit held for the unit, the payer optional', () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '25000' } });
    fireEvent.click(screen.getByLabelText('Bank Transfer'));
    fireEvent.change(screen.getByLabelText('Payment Number'), { target: { value: 'UTR123' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Fit-out deposit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post deposit' }));

    expect(mocks.take.mutate).toHaveBeenCalledWith(
      {
        unit_id: 'u-1',
        amount: 25000,
        receipt_date: '2026-10-20',
        mode: 'bank_transfer',
        reference_number: 'UTR123',
        payment_bank: null,
        instrument_date: null,
        bank_account_id: null,
        description: 'Fit-out deposit',
      },
      expect.anything(),
    );
  });

  it('sends the payer when one is picked and needs an amount', () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Post deposit' }));
    expect(mocks.take.mutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Payer'), { target: { value: 'm-1' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '500' } });
    fireEvent.click(screen.getByLabelText('Cash'));
    fireEvent.click(screen.getByRole('button', { name: 'Post deposit' }));
    expect(mocks.take.mutate).toHaveBeenCalledWith(expect.objectContaining({ payer_member_id: 'm-1', amount: 500, mode: 'cash' }), expect.anything());
  });
});
