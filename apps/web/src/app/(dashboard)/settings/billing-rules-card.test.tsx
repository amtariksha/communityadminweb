import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingRulesCard } from './billing-rules-card';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  deactivateRule: vi.fn(),
  rules: [] as unknown[],
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
// The real select loads the GST rate list from the API.
vi.mock('@/components/ui/gst-rate-select', () => ({
  GstRateSelect: ({ id, value }: { id?: string; value: number | null }) => (
    <input id={id} readOnly value={value ?? ''} aria-label="GST Rate" />
  ),
}));
vi.mock('@/hooks', () => ({
  useInvoiceRules: () => ({ data: mocks.rules, isLoading: false }),
  useLedgerAccounts: () => ({
    data: { data: [{ id: 'led-1', code: '4001', name: 'Maintenance Income' }] },
    isLoading: false,
  }),
  useCreateInvoiceRule: () => ({ mutate: mocks.createRule, isPending: false }),
  useUpdateInvoiceRule: () => ({ mutate: mocks.updateRule, isPending: false }),
  useDeactivateInvoiceRule: () => ({ mutate: mocks.deactivateRule, isPending: false }),
}));

// What GET /invoices/rules returns: DECIMAL columns arrive as strings and
// the GST is gst_rule + gst_percentage.
const flatRule = {
  id: 'rule-flat',
  name: 'Maintenance',
  ledger_account_id: 'led-1',
  frequency: 'monthly',
  charge_type: 'flat',
  is_per_sqft: false,
  amount: '3.00',
  gst_rule: 'none',
  gst_percentage: '0.00',
  is_active: true,
};
const gstRule = {
  ...flatRule,
  id: 'rule-gst',
  name: 'Clubhouse',
  gst_rule: 'full',
  gst_percentage: '18.00',
};

beforeEach(() => {
  mocks.rules = [flatRule, gstRule];
});
afterEach(() => vi.clearAllMocks());

const rowOf = (name: string): HTMLElement => screen.getByText(name).closest('tr') as HTMLElement;

describe('BillingRulesCard', () => {
  it('shows each rule\'s GST: N/A for none, the percentage otherwise', () => {
    render(<BillingRulesCard />);

    expect(within(rowOf('Maintenance')).getByText('N/A')).toBeTruthy();
    expect(within(rowOf('Clubhouse')).getByText('18%')).toBeTruthy();
  });

  it('Off switches the rule off through DELETE, which the API has always had', () => {
    render(<BillingRulesCard />);

    fireEvent.click(within(rowOf('Maintenance')).getByRole('button', { name: /Off/ }));

    expect(mocks.deactivateRule).toHaveBeenCalledWith('rule-flat', expect.anything());
    expect(mocks.updateRule).not.toHaveBeenCalled();
  });

  it('Edit opens with the rule\'s GST ticked and its rate filled in', () => {
    render(<BillingRulesCard />);

    fireEvent.click(within(rowOf('Clubhouse')).getByRole('button', { name: 'Edit' }));

    expect((screen.getByLabelText(/GST applicable/i) as HTMLInputElement).checked).toBe(true);
  });

  it('an edit that unticks GST says so, so the API clears the old GST', () => {
    render(<BillingRulesCard />);
    fireEvent.click(within(rowOf('Clubhouse')).getByRole('button', { name: 'Edit' }));

    fireEvent.click(screen.getByLabelText(/GST applicable/i));
    fireEvent.click(screen.getByRole('button', { name: 'Save Rule' }));

    expect(mocks.updateRule).toHaveBeenCalledWith(
      { id: 'rule-gst', data: expect.objectContaining({ is_gst_applicable: false }) },
      expect.anything(),
    );
  });

  it('an edit keeps GST at 18% when it stays ticked', () => {
    render(<BillingRulesCard />);
    fireEvent.click(within(rowOf('Clubhouse')).getByRole('button', { name: 'Edit' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save Rule' }));

    expect(mocks.updateRule).toHaveBeenCalledWith(
      {
        id: 'rule-gst',
        data: expect.objectContaining({ is_gst_applicable: true, gst_rule: 'full', gst_rate: 18 }),
      },
      expect.anything(),
    );
  });
});
