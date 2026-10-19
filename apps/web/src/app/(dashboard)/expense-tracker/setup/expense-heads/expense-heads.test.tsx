import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpenseHeadsContent } from './expense-heads-content';
import { validateExpenseHead } from './expense-head-form';

/** EXP-19 / EXP-S1 — expense heads with HSN/SAC, Update opens the form. */

const mocks = vi.hoisted(() => ({ update: vi.fn(), filters: [] as unknown[], mode: 'dialog' as 'dialog' | 'page' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/expense-tracker/setup/expense-heads',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/form-page', async (original) => ({
  ...(await original<typeof import('@/components/form-page')>()),
  useFormMode: () => mocks.mode,
}));
vi.mock('@/lib/finance-roles', () => ({ canWriteFinance: () => true }));
vi.mock('@/hooks/use-ledger', () => ({
  useLedgerAccounts: (filters: unknown) => {
    mocks.filters.push(filters);
    return {
      isLoading: false,
      data: { total: 1, data: [{ id: 'la-1', code: '5100', name: 'Repairs', hsn_sac: '998719' }] },
    };
  },
  useUpdateLedgerAccount: () => ({ mutate: mocks.update, isPending: false }),
}));

afterEach(() => {
  vi.clearAllMocks();
  mocks.filters = [];
});

describe('Expense Heads', () => {
  it('lists expense ledgers with HSN/SAC', () => {
    render(<ExpenseHeadsContent />);
    expect(mocks.filters[0]).toMatchObject({ account_type: 'expense' });
    expect(screen.getByText('998719')).toBeTruthy();
  });

  it('Update saves the name and a valid HSN/SAC; blank clears it', () => {
    render(<ExpenseHeadsContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    fireEvent.change(screen.getByLabelText('HSN/SAC'), { target: { value: '998' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('HSN/SAC must be 4, 6 or 8 digits')).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('HSN/SAC'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mocks.update.mock.calls[0][0]).toEqual({ id: 'la-1', data: { name: 'Repairs', hsn_sac: null } });
  });

  it('checks the fields', () => {
    expect(validateExpenseHead('Repairs', '9987')).toEqual({});
    expect(validateExpenseHead('', '12345')).toEqual({
      name: 'Account Name is 1 to 255 characters',
      hsn_sac: 'HSN/SAC must be 4, 6 or 8 digits',
    });
  });
});
