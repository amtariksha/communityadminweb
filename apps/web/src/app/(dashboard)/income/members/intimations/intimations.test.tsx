import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PaymentIntimation } from '@/hooks/use-payment-intimations';
import { intimationActions } from './intimation-columns';
import { ConfirmIntimationDialog } from './intimation-dialogs';

// INC-65: the paid-intimation queue.

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), receipts: [] as Array<{ id: string; receipt_number: string; amount: string; receipt_date: string }> }));
vi.mock('@/hooks/use-payment-intimations', () => ({
  useConfirmIntimation: () => ({ mutate: mocks.confirm, isPending: false }),
  useRejectIntimation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/use-receipts', () => ({ useReceipts: () => ({ data: { data: mocks.receipts } }) }));
vi.mock('@/components/unit-posting/collection-fields', () => ({ BankAccountSelect: () => null }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const row: PaymentIntimation = {
  id: 'p1', unit_id: 'u1', unit_number: 'C-301', block: 'C', reported_by: 'Test Owner', amount: 1000, paid_on: '2026-10-18',
  mode: 'upi', reference: 'UTR-1', bank: null, note: null, has_proof: false, scope: 'member', status: 'pending',
  receipt_id: null, receipt_number: null, reject_reason: null, created_at: '2026-10-18T10:00:00Z',
};

describe('Paid intimations', () => {
  it('lets finance writers confirm or reject a waiting one, and shows proof only when attached', () => {
    const actions = intimationActions({ canRead: true, canWrite: true }, vi.fn());
    const shown = (item: PaymentIntimation) => actions.filter((action) => !action.hidden?.(item)).map((action) => action.key);
    expect(shown(row)).toEqual(['confirm', 'reject']);
    expect(shown({ ...row, has_proof: true, status: 'confirmed' })).toEqual(['proof']);
    expect(intimationActions({ canRead: true, canWrite: false }, vi.fn()).map((action) => action.key)).toEqual(['proof']);
  });

  it('posts the collection on confirm, with the date and reference given', () => {
    render(<ConfirmIntimationDialog row={row} onClose={vi.fn()} />);
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Post collection' })));
    expect(mocks.confirm).toHaveBeenCalledWith({ id: 'p1', receipt_date: '2026-10-18', bank_account_id: null, reference: 'UTR-1' }, expect.anything());
  });

  it('matches a receipt already posted, of the same amount', () => {
    mocks.receipts = [
      { id: 'r1', receipt_number: 'RCT-1', amount: '1000.00', receipt_date: '2026-10-18' },
      { id: 'r2', receipt_number: 'RCT-2', amount: '999.00', receipt_date: '2026-10-18' },
    ];
    render(<ConfirmIntimationDialog row={row} onClose={vi.fn()} />);
    const select = screen.getByLabelText('Receipt already posted') as HTMLSelectElement;
    expect([...select.options].map((option) => option.value)).toEqual(['', 'r1']);
    fireEvent.change(select, { target: { value: 'r1' } });
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Match receipt' })));
    expect(mocks.confirm).toHaveBeenLastCalledWith({ id: 'p1', receipt_id: 'r1' }, expect.anything());
  });
});
