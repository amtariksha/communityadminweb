import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreditNoteFormPage } from './credit-note-form';

/** INC-25 — the three credit-note pages of a unit post the body their kind needs. */

const mocks = vi.hoisted(() => ({
  post: { mutate: vi.fn(), isPending: false },
  addToast: vi.fn(),
}));

vi.mock('@/hooks/use-unit-posting', () => ({
  usePostUnitCreditNote: () => mocks.post,
  useUnitDuesRow: () => ({ data: { unit_id: 'u-1', unit_number: '101', block: 'A', billing_name: 'Asha Rao', due: '1800.00' } }),
}));
vi.mock('@/hooks/use-unit-statement', () => ({
  useOpenBills: () => ({
    data: [
      { id: 'b1', invoice_number: 'INV-0001', bill_date: '2026-09-01', due_date: '2026-09-11', account: 'Maintenance', details: 'Sep 2026', bill_amount: '1000.00', remaining: '1000.00', income_scope: 'member' },
      { id: 'b2', invoice_number: 'INV-0002', bill_date: '2026-10-01', due_date: '2026-10-11', account: 'Maintenance', details: 'Oct 2026', bill_amount: '1000.00', remaining: '800.00', income_scope: 'member' },
    ],
  }),
}));
vi.mock('@/hooks/use-units', () => ({
  useUnitMembers: () => ({ data: [{ id: 'm-1', member_type: 'owner', name: 'Asha Rao' }, { id: 'm-2', member_type: 'family', name: 'Child' }] }),
}));
vi.mock('@/components/ui/account-search-select', () => ({
  AccountSearchSelect: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <select aria-label="Income account" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Pick</option>
      <option value="parking">Parking</option>
    </select>
  ),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

const renderPage = (page: 'general' | 'account' | 'specific') =>
  render(<CreditNoteFormPage unitId="u-1" page={page} today="2026-10-15" onClose={vi.fn()} onPosted={vi.fn()} />);

describe('CreditNoteFormPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts a general note against the Credit Note account', () => {
    renderPage('general');

    expect(screen.getByText('Credit Note')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Comments'), { target: { value: 'Goodwill' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post Credit Note' }));

    expect(mocks.post.mutate).toHaveBeenCalledWith(
      { unit_id: 'u-1', reason: 'Goodwill', credit_note_date: '2026-10-15', kind: 'general', amount: 500 },
      expect.anything(),
    );
  });

  it('posts an account-specific note with its account', () => {
    renderPage('account');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '400' } });
    fireEvent.change(screen.getByLabelText('Income account'), { target: { value: 'parking' } });
    fireEvent.change(screen.getByLabelText('Comments'), { target: { value: 'Slot not given' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post Credit Note' }));

    expect(mocks.post.mutate).toHaveBeenCalledWith(expect.objectContaining({ kind: 'account_specific', ledger_account_id: 'parking', amount: 400 }), expect.anything());
  });

  it('posts a specific note on the ticked bill, defaulting its amount to what is left', () => {
    renderPage('specific');

    expect(screen.queryByRole('option', { name: /Child/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('Payer'), { target: { value: 'm-1' } });
    fireEvent.click(screen.getByLabelText('Select INV-0002'));
    expect((screen.getByLabelText('Amount for INV-0002') as HTMLInputElement).value).toBe('800.00');
    fireEvent.change(screen.getByLabelText('Amount for INV-0002'), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText('Comments'), { target: { value: 'Lift was down' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post Credit Note' }));

    expect(mocks.post.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'specific', payer_member_id: 'm-1', bills: [{ invoice_id: 'b2', amount: 200 }] }),
      expect.anything(),
    );
  });

  it('does not post a specific note with no bill ticked', () => {
    renderPage('specific');

    fireEvent.change(screen.getByLabelText('Payer'), { target: { value: 'm-1' } });
    fireEvent.change(screen.getByLabelText('Comments'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post Credit Note' }));

    expect(mocks.post.mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Select at least one bill')).toBeTruthy();
  });
});
