import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChallansAndRemittances } from './remittance-tables';
import { reverseEffect } from './reverse-remittance-dialog';

/** Taxes › TDS Challans / Remittances: Reverse, including a challan recorded before remittances posted journals. */

const mocks = vi.hoisted(() => ({
  canWrite: true,
  reverse: vi.fn(),
  toast: vi.fn(),
  challans: [] as unknown[],
}));

vi.mock('@/hooks', () => ({
  useChallans: () => ({ data: mocks.challans, isLoading: false }),
  useRemittances: () => ({ data: [{ id: 'rm-1', type: 'pf', period: '2026-09', amount: 1800, payment_date: '2026-10-05', reference_number: null, notes: null, journal_entry_id: null }], isLoading: false }),
}));
vi.mock('@/hooks/use-tax-registers', () => ({ useReverseRemittance: () => ({ mutate: mocks.reverse, isPending: false }) }));
vi.mock('@/lib/finance-roles', () => ({ canWriteFinance: () => mocks.canWrite }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.toast }) }));

describe('ChallansAndRemittances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canWrite = true;
    mocks.challans = [
      { id: 'ch-old', challan_number: 'CH-OLD-1', tds_section: '393(1)', amount: 1000, payment_date: '2026-05-07', bsr_code: null, bank_name: null, journal_entry_id: null },
      { id: 'ch-new', challan_number: 'CH-0091', tds_section: '393(1)', amount: 3000, payment_date: '2026-10-07', bsr_code: null, bank_name: null, journal_entry_id: 'je-1' },
      { id: 'ch-rev', challan_number: 'CH-0090', tds_section: '393(1)', amount: 500, payment_date: '2026-10-01', bsr_code: null, bank_name: null, journal_entry_id: 'je-2', is_reversed: true, reversal_reason: 'Paid twice' },
    ];
  });

  it('reverses a challan recorded without a journal, saying nothing in the books changes', () => {
    render(<ChallansAndRemittances />);
    fireEvent.click(within(screen.getByText('CH-OLD-1').closest('tr') as HTMLElement).getByRole('button', { name: 'Reverse' }));
    expect(screen.getByText(/recorded without a journal entry, so nothing in the books changes/)).toBeTruthy();

    const confirm = screen.getAllByRole('button', { name: 'Reverse' }).at(-1) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Entered twice' } });
    fireEvent.click(confirm);
    expect(mocks.reverse).toHaveBeenCalledWith({ id: 'ch-old', reason: 'Entered twice' }, expect.anything());
  });

  it('marks a reversed row and offers Reverse to finance writers only', () => {
    render(<ChallansAndRemittances />);
    const reversed = screen.getByText('CH-0090').closest('tr') as HTMLElement;
    expect(within(reversed).getByText('Reversed')).toBeTruthy();
    expect(within(reversed).queryByRole('button', { name: 'Reverse' })).toBeNull();
    expect(within(screen.getByText('2026-09').closest('tr') as HTMLElement).getByRole('button', { name: 'Reverse' })).toBeTruthy();
  });

  it('hides Reverse from readers', () => {
    mocks.canWrite = false;
    render(<ChallansAndRemittances />);
    expect(screen.queryByRole('button', { name: 'Reverse' })).toBeNull();
  });

  it('says a challan with a journal gets an inverse entry', () => {
    expect(reverseEffect({ id: 'x', label: 'Challan CH-0091', hasEntry: true })).toMatch(/inverse entry dated today/);
  });
});
