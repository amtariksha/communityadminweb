import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { RuleLine, RuleTypeGroup } from '@/hooks/use-billing-rules';
import { RuleTypeTable } from './rule-type-table';
import { RuleLineForm } from './rule-line-form';

const mocks = vi.hoisted(() => ({ add: vi.fn(), revise: vi.fn() }));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-ledger', () => ({
  useLedgerAccounts: () => ({ data: { data: [{ id: 'maint', code: '4001', name: 'Maintenance Income' }] } }),
}));
vi.mock('@/hooks/use-billing-rules', () => ({
  useAddRuleLine: () => ({ mutateAsync: mocks.add, isPending: false }),
  useReviseRuleLine: () => ({ mutateAsync: mocks.revise, isPending: false }),
}));

const line = (overrides: Partial<RuleLine> = {}): RuleLine => ({
  id: 'l1', category_id: 'general', ledger_account_id: 'maint', account_name: 'Maintenance Income', account_code: '4001',
  rule_type: 'standard', rate_sqft1_month: '2.5000', rate_sqft2_month: '1.0000', unit_fee_month: '200.00',
  gst_applicable: false, gst_rate: '18.00', interest_applicable: true, hsn_sac: null,
  effective_from: '2026-04-01', effective_to: null, revises_line_id: null, status: 'active', ...overrides,
});

const group = (name: string, lines: RuleLine[]): RuleTypeGroup => ({
  category: { id: name.toLowerCase(), name, gst_threshold_applies: true, sort_order: 10 },
  lines,
});

afterEach(() => vi.clearAllMocks());

describe('Setup › Auto Invoicing rule tables (INC-17)', () => {
  it('draws one table per unit type with the six columns', () => {
    render(
      <>
        <RuleTypeTable group={group('General', [line()])} canWrite onAdd={vi.fn()} onRevise={vi.fn()} />
        <RuleTypeTable group={group('Penthouse', [])} canWrite onAdd={vi.fn()} onRevise={vi.fn()} />
      </>,
    );
    const general = screen.getByRole('table', { name: 'Rules for Unit Type : General' });
    expect(screen.getByRole('table', { name: 'Rules for Unit Type : Penthouse' })).toBeTruthy();
    expect(within(general).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Income Account', 'Rule', 'GST Applicable', 'Apply Interest', 'Effective From', 'Revise',
    ]);
    expect(within(general).getByText('₹2.50 / sq.ft 1 + ₹1.00 / sq.ft 2 + ₹200 per unit, per month')).toBeTruthy();
  });

  it('offers Edit Line Item on the latest version only, and nothing to a reader', () => {
    const versions = [line(), line({ id: 'l2', effective_from: '2026-12-01', status: 'scheduled' })];
    const onRevise = vi.fn();
    const { unmount } = render(<RuleTypeTable group={group('General', versions)} canWrite onAdd={vi.fn()} onRevise={onRevise} />);
    const buttons = screen.getAllByRole('button', { name: 'Edit Line Item' });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(onRevise).toHaveBeenCalledWith(versions[1]);
    unmount();

    render(<RuleTypeTable group={group('General', versions)} canWrite={false} onAdd={vi.fn()} onRevise={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Edit Line Item' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add Line Item/ })).toBeNull();
  });
});

describe('Add / Edit Line Item (INC-17)', () => {
  const category = { id: 'general', name: 'General' };

  it('adds a line with the typed fees', async () => {
    mocks.add.mockResolvedValue(line());
    const onSaved = vi.fn();
    render(<RuleLineForm mode="page" onClose={vi.fn()} onSaved={onSaved} category={category} />);
    fireEvent.change(screen.getByLabelText('Income Account'), { target: { value: 'maint' } });
    fireEvent.change(screen.getByLabelText('Fee / Sq.ft 1 / Month'), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText('Unit Fee / Month'), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText('Effective date'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mocks.add).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'general', ledger_account_id: 'maint', rate_sqft1_month: 2.5, unit_fee_month: 200, effective_from: '2026-11-01' }),
    );
  });

  it('shows the server’s message for a second line on the same account', async () => {
    mocks.add.mockRejectedValue(
      new ApiError(409, { message: 'This account already has a line for this unit type — use Edit Line Item.', code: 'rule_line_exists' } as never),
    );
    render(<RuleLineForm mode="page" onClose={vi.fn()} category={category} />);
    fireEvent.change(screen.getByLabelText('Income Account'), { target: { value: 'maint' } });
    fireEvent.change(screen.getByLabelText('Unit Fee / Month'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Effective date'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findByRole('alert')).textContent).toBe('This account already has a line for this unit type — use Edit Line Item.');
  });

  it('revises with a later date only, keeping the account', async () => {
    mocks.revise.mockResolvedValue(line({ id: 'l2' }));
    render(<RuleLineForm mode="page" onClose={vi.fn()} category={category} line={line()} />);
    expect(screen.queryByLabelText('Income Account')).toBeNull();
    fireEvent.change(screen.getByLabelText('Fee / Sq.ft 1 / Month'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Effective date'), { target: { value: '2026-03-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByText('Pick a date after 2026-04-01.')).toBeTruthy();
    expect(mocks.revise).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Effective date'), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await vi.waitFor(() => expect(mocks.revise).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1', rate_sqft1_month: 3, effective_from: '2026-12-01' })));
  });

  it('lets only the Standard rule be chosen', () => {
    render(<RuleLineForm mode="page" onClose={vi.fn()} category={category} />);
    const strip = screen.getByRole('group', { name: 'Rule type' });
    const buttons = within(strip).getAllByRole('button');
    expect(buttons[0].hasAttribute('disabled')).toBe(false);
    expect(buttons.slice(1).every((b) => b.hasAttribute('disabled'))).toBe(true);
  });
});
