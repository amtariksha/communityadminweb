import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionFormView } from './collection-form';

/** INC-26 — Post Collection for a unit sends the bills, TDS and instrument details. */

const mocks = vi.hoisted(() => ({
  create: { mutate: vi.fn(), isPending: false },
  addToast: vi.fn(),
  bills: [] as unknown[],
}));

vi.mock('@/hooks/use-receipts', () => ({ useCreateReceipt: () => mocks.create }));
vi.mock('@/hooks/use-unit-statement', () => ({ useOpenBills: () => ({ data: mocks.bills }) }));
vi.mock('@/hooks/use-unit-posting', () => ({
  useUnitDuesRow: () => ({ data: { unit_id: 'u-1', unit_number: '101', block: 'A', billing_name: 'Asha Rao', due: '20000.00' } }),
}));
vi.mock('@/hooks/use-units', () => ({ useUnitMembers: () => ({ data: [{ id: 'm-1', member_type: 'owner', name: 'Asha Rao' }] }) }));
vi.mock('@/hooks/use-ledger', () => ({ useLedgerAccounts: () => ({ data: { data: [{ id: 'bank-1', name: 'Bank Account', code: 'bank', is_bank_account: true }] } }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

const bill = (id: string, number: string) => ({
  id,
  invoice_number: number,
  bill_date: '2026-09-01',
  due_date: '2026-09-11',
  account: 'Maintenance',
  details: 'Sep 2026',
  bill_amount: '10000.00',
  remaining: '10000.00',
  income_scope: 'member',
});

const renderForm = (preselect: string | null = null) =>
  render(<CollectionFormView unitId="u-1" mode="page" today="2026-10-15" preselectBillId={preselect} onClose={vi.fn()} onPosted={vi.fn()} />);

describe('CollectionFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bills = [bill('a', 'INV-0001'), bill('b', 'INV-0002')];
  });

  it('pays a ticked bill by cheque with TDS', () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Payer'), { target: { value: 'm-1' } });
    fireEvent.click(screen.getByLabelText('Select INV-0001'));
    fireEvent.change(screen.getByLabelText('Amount for INV-0001'), { target: { value: '9000' } });
    fireEvent.change(screen.getByLabelText('TDS for INV-0001'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('Payment Number'), { target: { value: '445566' } });
    fireEvent.change(screen.getByLabelText('Payment Bank'), { target: { value: 'Test Bank' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post amount' }));

    expect(mocks.create.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        unit_id: 'u-1',
        amount: 9000,
        mode: 'cheque',
        reference_number: '445566',
        payment_bank: 'Test Bank',
        payer_member_id: 'm-1',
        allocations: [{ invoice_id: 'a', amount: 9000, tds_amount: 1000 }],
      }),
      expect.anything(),
    );
  });

  it('disables the bill ticks under FiFo and posts the amount spread', () => {
    renderForm();

    fireEvent.click(screen.getByLabelText('Any Invoice on FiFo Basis'));
    expect((screen.getByLabelText('Select INV-0001') as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Payer'), { target: { value: 'm-1' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '15000' } });
    fireEvent.click(screen.getByLabelText('Cash'));
    fireEvent.click(screen.getByRole('button', { name: 'Post amount' }));

    expect(mocks.create.mutate).toHaveBeenCalledWith(expect.objectContaining({ amount: 15000, mode: 'cash', allocation_mode: 'fifo' }), expect.anything());
  });

  it('does not post a cheque without its bank', () => {
    renderForm('a');

    fireEvent.change(screen.getByLabelText('Payer'), { target: { value: 'm-1' } });
    fireEvent.change(screen.getByLabelText('Payment Number'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post amount' }));

    expect(mocks.create.mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Give the bank it is drawn on')).toBeTruthy();
  });

  it('ticks the bill it was opened for, paid in full', () => {
    renderForm('b');

    expect((screen.getByLabelText('Select INV-0002') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Amount for INV-0002') as HTMLInputElement).value).toBe('10000.00');
  });

  it('holds the amount as an advance when nothing is open', () => {
    mocks.bills = [];
    renderForm();

    expect(screen.getByText('No open bills — the amount will be held as an advance.')).toBeTruthy();
    expect(screen.getByLabelText('Amount')).toBeTruthy();
  });
});
