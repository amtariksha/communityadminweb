import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { PayerCollectionFormView } from './payer-collection-form';

/** INC-45 — Post Collection for a non-member payer. */

const mocks = vi.hoisted(() => ({
  post: { mutate: vi.fn(), isPending: false },
  addToast: vi.fn(),
  bills: { data: [] as unknown[], isLoading: false, error: null as unknown },
}));

vi.mock('@/hooks/use-payer-ledger', () => ({
  usePayerOpenBills: () => mocks.bills,
  usePostPayerCollection: () => mocks.post,
}));
vi.mock('@/hooks/use-customers', () => ({ useCustomer: () => ({ data: { id: 'c-1', name: 'Sunrise Events' } }) }));
vi.mock('@/hooks/use-ledger', () => ({ useLedgerAccounts: () => ({ data: { data: [] } }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

const bill = {
  id: 'a',
  invoice_number: 'NM-0001',
  bill_date: '2026-09-01',
  due_date: '2026-09-16',
  account: 'Hall Hire',
  details: 'Hall booking',
  bill_amount: '11800.00',
  remaining: '11800.00',
  income_scope: 'non_member',
};

const renderForm = () =>
  render(<PayerCollectionFormView customerId="c-1" mode="page" today="2026-10-20" onClose={vi.fn()} onPosted={vi.fn()} />);

describe('PayerCollectionFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bills = { data: [bill], isLoading: false, error: null };
  });

  it('shows the payer and what it owes, without a payer select', () => {
    renderForm();

    expect(screen.getByText('Sunrise Events')).toBeTruthy();
    expect(screen.getByText('Current Due').nextElementSibling?.textContent).toBe('₹11,800');
    expect(screen.queryByLabelText('Payer')).toBeNull();
  });

  it('posts the ticked invoice against the payer', () => {
    renderForm();

    fireEvent.click(screen.getByLabelText('Select NM-0001'));
    fireEvent.click(screen.getByLabelText('Cash'));
    fireEvent.click(screen.getByRole('button', { name: 'Post amount' }));

    expect(mocks.post.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: 'c-1', amount: 11800, allocations: [{ invoice_id: 'a', amount: 11800 }] }),
      expect.anything(),
    );
    expect(mocks.post.mutate.mock.calls[0][0]).not.toHaveProperty('unit_id');
  });

  it('refuses more than the payer owes under FiFo', () => {
    renderForm();

    fireEvent.click(screen.getByLabelText('Any Invoice on FiFo Basis'));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12000' } });
    fireEvent.click(screen.getByLabelText('Cash'));
    fireEvent.click(screen.getByRole('button', { name: 'Post amount' }));

    expect(mocks.post.mutate).not.toHaveBeenCalled();
    expect(screen.getByText(/at most 11800.00/)).toBeTruthy();
  });

  it("shows the server's message on an overpayment it refuses", () => {
    mocks.post.mutate.mockImplementation((_input: unknown, options: { onError: (error: unknown) => void }) =>
      options.onError(new ApiError(400, { statusCode: 400, error: 'Bad Request', message: 'A non-member payer holds no advance.', code: 'payer_overpayment' } as never)),
    );
    renderForm();

    fireEvent.click(screen.getByLabelText('Select NM-0001'));
    fireEvent.click(screen.getByLabelText('Cash'));
    fireEvent.click(screen.getByRole('button', { name: 'Post amount' }));

    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ description: 'A non-member payer holds no advance.' }));
  });

  it('says the screen is not available yet when the route is missing', () => {
    mocks.bills = { data: [], isLoading: false, error: new ApiError(404, { statusCode: 404, error: 'Not Found', message: 'Cannot GET' } as never) };
    renderForm();

    expect(screen.getByText('Collection from a non-member payer is not available yet on this server.')).toBeTruthy();
  });
});
