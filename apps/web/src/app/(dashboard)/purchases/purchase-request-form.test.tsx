import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApproverGrid } from '@/hooks/use-approver-grid';
import type { PRDetail } from '@/hooks/use-purchase-requests';
import { PurchaseRequestForm } from './purchase-request-form';

/**
 * EXP-08 — the purchase request form: lines by expense head with GST per
 * line and live totals by the server's rule, GST type from the vendor's
 * state, approvers per level from the SB-11 grid, Save as draft / Send.
 */

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  submit: vi.fn(),
  detail: undefined as PRDetail | null | undefined,
  grid: null as ApproverGrid | null,
  heads: undefined as unknown,
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/auth', () => ({ getUser: () => ({ id: 'me' }) }));
vi.mock('@/hooks/use-vendors', () => ({
  useVendors: () => ({
    data: {
      data: [
        { id: 'v-mh', name: 'Mumbai Pumps', state_code: '27', gstin: null, is_active: true },
        { id: 'v-ka', name: 'Bengaluru Paints', state_code: '29', gstin: null, is_active: true },
      ],
    },
  }),
}));
vi.mock('@/hooks/use-approver-grid', () => ({ useApproverGrid: () => ({ data: mocks.grid }) }));
vi.mock('@/hooks/use-purchase-requests', () => ({
  useExpenseHeadsSummary: () => ({ data: mocks.heads }),
  usePurchaseRequestDetail: () => ({ data: mocks.detail }),
  useCreatePurchaseRequest: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdatePurchaseRequest: () => ({ mutateAsync: mocks.update, isPending: false }),
  useSubmitPurchaseRequest: () => ({ mutateAsync: mocks.submit, isPending: false }),
  useWithdrawPurchaseRequest: () => ({ mutate: vi.fn(), isPending: false }),
}));

const HEADS = {
  data: [
    { ledger_account_id: 'h-repair', code: '5100', name: 'Repairs', group_name: 'Expenses', hsn_sac: '998719', budget_amount: null, booked_amount: '1200.00' },
    { ledger_account_id: 'h-paint', code: '5200', name: 'Painting', group_name: 'Expenses', hsn_sac: null, budget_amount: null, booked_amount: '0.00' },
  ],
  financial_year: null,
  gst: { society_state_code: '29', rate_options: [0, 5, 18, 40], pre_reform_rates: [12, 28], reform_date: '2025-09-22' },
};

const GRID: ApproverGrid = {
  request_type: 'purchase_request',
  configured: true,
  people: [
    { user_id: 'u-anil', name: 'Anil Kumar', roles: ['committee_member'], level: 1 },
    { user_id: 'u-bina', name: 'Bina Rao', roles: ['committee_member'], level: 1 },
    { user_id: 'me', name: 'Me', roles: ['accountant'], level: 1 },
  ],
  levels: [
    { level: 1, min_approvals: 2, approver_count: 3 },
    { level: 2, min_approvals: 1, approver_count: 0 },
    { level: 3, min_approvals: 1, approver_count: 0 },
  ],
};

beforeEach(() => {
  mocks.heads = HEADS;
  mocks.grid = GRID;
  mocks.detail = undefined;
  mocks.create.mockResolvedValue({ purchase_request: { id: 'pr-1' } });
});
afterEach(() => vi.clearAllMocks());

const renderForm = (onSaved = vi.fn()) => {
  render(<PurchaseRequestForm mode="page" onClose={vi.fn()} onSaved={onSaved} />);
  return onSaved;
};

function addHead(name: string): void {
  fireEvent.click(screen.getByRole('button', { name: '+ Add account head' }));
  fireEvent.click(screen.getByRole('button', { name: `Add ${name}` }));
}

function fillHeader(vendor: string): void {
  fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'Pump and paint' } });
  fireEvent.change(screen.getByLabelText('Vendor'), { target: { value: vendor } });
}

describe('PurchaseRequestForm', () => {
  it('a vendor in another state defaults a new line to IGST; the head brings its HSN/SAC', () => {
    renderForm();
    fillHeader('v-mh');
    addHead('Repairs');

    expect((screen.getByLabelText('Line 1 GST type') as HTMLSelectElement).value).toBe('igst');
    expect((screen.getByLabelText('Line 1 HSN/SAC') as HTMLInputElement).value).toBe('998719');
  });

  it('totals follow the server rule (EXP-06 example: ₹2,360.00)', () => {
    renderForm();
    fillHeader('v-ka');
    addHead('Repairs');
    addHead('Painting');
    fireEvent.change(screen.getByLabelText('Line 1 quantity'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Line 1 rate'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Line 2 rate'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('Line 2 GST type'), { target: { value: 'igst' } });

    const totals = screen.getByLabelText('Totals');
    expect(within(totals).getByText('₹2,360.00')).toBeTruthy();
    expect(within(totals).getAllByText('₹90.00')).toHaveLength(2);
    expect(within(totals).getByText('₹180.00')).toBeTruthy();
  });

  it('names the grid’s approvers without the author, and refuses a minimum above them', () => {
    renderForm();
    fillHeader('v-ka');
    addHead('Repairs');
    fireEvent.change(screen.getByLabelText('Line 1 rate'), { target: { value: '100' } });
    expect(screen.getByText(/Level 1 \* — 2 approvers · min 2/)).toBeTruthy();
    expect(screen.queryByLabelText('Me')).toBeNull();

    fireEvent.change(screen.getByLabelText('Level 1 min approvals'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send for approval' }));

    expect(screen.getAllByText('Min approvals cannot exceed approvers').length).toBeGreaterThan(0);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('Save as draft sends the lines and no approvers, with submit false', async () => {
    const onSaved = renderForm();
    fillHeader('v-ka');
    addHead('Repairs');
    fireEvent.change(screen.getByLabelText('Line 1 quantity'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Line 1 rate'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Request details'), { target: { value: 'Two pumps <urgent>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());

    expect(mocks.create.mock.calls[0][0]).toEqual({
      title: 'Pump and paint',
      vendor_id: 'v-ka',
      request_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      details_html: '<p>Two pumps &lt;urgent&gt;</p>',
      lines: [
        { ledger_account_id: 'h-repair', description: null, hsn_sac: '998719', quantity: 2, unit_rate: 500, gst_type: 'cgst_sgst', gst_rate: 18 },
      ],
      submit: false,
    });
    expect(onSaved.mock.calls[0][1]).toBe(false);
  });

  it('Send for approval carries the chosen approvers and minimum', async () => {
    renderForm();
    fillHeader('v-ka');
    addHead('Painting');
    fireEvent.change(screen.getByLabelText('Line 1 rate'), { target: { value: '100' } });
    fireEvent.click(screen.getByLabelText('Bina Rao'));
    fireEvent.change(screen.getByLabelText('Level 1 min approvals'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send for approval' }));
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalled());

    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      submit: true,
      approval: { levels: [{ level: 1, approver_user_ids: ['u-anil'], min_approvals: 1 }] },
    });
  });

  it('needs at least one expense head', () => {
    renderForm();
    fillHeader('v-ka');
    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    expect(screen.getAllByText('Add at least one expense head').length).toBeGreaterThan(1);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('opens someone else’s request read-only', () => {
    mocks.detail = {
      purchase_request: { id: 'pr-9', pr_number: 'PR-00009', title: 'Lift repair', status: 'draft', requested_by: 'someone-else', request_date: '2026-10-01', details_html: null, estimated_amount: '500.00' },
      lines: [],
      legacy: false,
      totals: { grand_total: '500.00' },
      attachments: [],
      approval: null,
    } as unknown as PRDetail;
    render(<PurchaseRequestForm mode="page" requestId="pr-9" onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByText('Purchase request PR-00009: Lift repair')).toBeTruthy();
    expect(screen.queryByLabelText('Title *')).toBeNull();
  });

  it('says so while the API has no lines yet', () => {
    mocks.heads = null;
    renderForm();
    expect(screen.getByText('Purchase requests with lines are not available yet.')).toBeTruthy();
  });
});
