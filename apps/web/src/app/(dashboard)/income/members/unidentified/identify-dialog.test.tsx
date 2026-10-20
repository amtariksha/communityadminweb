import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { IdentifyDialog } from './identify-dialog';

/** INC-48 — the Identify dialog: unit, the unit's open bills, FiFo or picked. */

const mocks = vi.hoisted(() => ({ identify: { mutate: vi.fn(), isPending: false }, addToast: vi.fn() }));

vi.mock('@/hooks/use-unidentified-collections', () => ({ useIdentifyCollection: () => mocks.identify }));
vi.mock('@/hooks/use-unit-statement', () => ({
  useOpenBills: (unitId: string) => ({
    data: unitId
      ? [{ id: 'b-1', invoice_number: 'INV-0007', bill_date: '2026-09-01', due_date: '2026-09-11', account: 'Maintenance', details: 'Sep', bill_amount: '4000.00', remaining: '4000.00', income_scope: 'member' }]
      : [],
  }),
}));
vi.mock('@/hooks/use-units', () => ({
  UNIT_PICKER_LIMIT: 1000,
  useUnits: () => ({ data: { data: [{ id: 'u-1', unit_number: '101', block: 'A' }] } }),
  useUnitMembers: () => ({ data: [{ id: 'm-1', member_type: 'owner', name: 'Asha Rao' }] }),
}));
vi.mock('@/components/ui/unit-search-select', () => ({
  UnitSearchSelect: ({ value, onChange, units }: { value: string; onChange: (id: string) => void; units: Array<{ id: string; unit_number: string }> }) => (
    <select aria-label="Unit" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Pick</option>
      {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_number}</option>)}
    </select>
  ),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

const COLLECTION = {
  id: 'r-9',
  receipt_number: 'RCT-0090',
  receipt_date: '2026-10-12',
  amount: '4000.00',
  payment_mode: 'bank_transfer',
  reference_number: 'UTR-77',
  bank_account_name: 'Bank Account',
  narration: 'NEFT without reference',
  status: 'open' as const,
  unit_id: null,
  unit_number: null,
  block: null,
  identified_at: null,
};

describe('IdentifyDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for the unit first', () => {
    render(<IdentifyDialog collection={COLLECTION} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Identify' }));
    expect(mocks.identify.mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Pick the unit the money came from')).toBeTruthy();
  });

  it('identifies to the unit oldest bills first', () => {
    render(<IdentifyDialog collection={COLLECTION} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'u-1' } });
    expect(screen.getByText('INV-0007')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Identify' }));

    expect(mocks.identify.mutate).toHaveBeenCalledWith({ id: 'r-9', unit_id: 'u-1', allocation_mode: 'fifo' }, expect.anything());
  });

  it('identifies against the bills picked', () => {
    render(<IdentifyDialog collection={COLLECTION} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'u-1' } });
    fireEvent.click(screen.getByLabelText('Pick bills'));
    fireEvent.click(screen.getByLabelText('Select INV-0007'));
    fireEvent.change(screen.getByLabelText('Amount for INV-0007'), { target: { value: '2500' } });
    fireEvent.change(screen.getByLabelText('Payer'), { target: { value: 'm-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Identify' }));

    expect(mocks.identify.mutate).toHaveBeenCalledWith(
      { id: 'r-9', unit_id: 'u-1', payer_member_id: 'm-1', allocation_mode: 'selected', allocations: [{ invoice_id: 'b-1', amount: 2500 }] },
      expect.anything(),
    );
    expect(screen.getByText(/Unit's advance ₹1,500/)).toBeTruthy();
  });

  it("shows the server's message when it was identified meanwhile", () => {
    mocks.identify.mutate.mockImplementation((_input: unknown, options: { onError: (error: unknown) => void }) =>
      options.onError(new ApiError(409, { message: 'Receipt RCT-0090 is already set against a unit.', code: 'already_identified' } as never)),
    );
    render(<IdentifyDialog collection={COLLECTION} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'u-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Identify' }));

    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Receipt RCT-0090 is already set against a unit.' }));
  });
});
