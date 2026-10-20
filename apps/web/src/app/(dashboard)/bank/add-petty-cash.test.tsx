import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddBankAccountForm } from './add-bank-account-form';
import { accountLabel } from './bank-types';

// Add account as Bank or Petty Cash (BANK-14, screen BANK-S11).

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/hooks', () => ({ useCreateBankAccount: () => ({ mutate: mocks.mutate, isPending: false }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

describe('Add account — petty cash', () => {
  it('hides the bank fields for petty cash and sends only the name and opening balance', async () => {
    render(<AddBankAccountForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText('IFSC Code')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Petty Cash'));
    expect(screen.queryByLabelText('IFSC Code')).toBeNull();
    expect(screen.queryByLabelText('Account Number')).toBeNull();
    fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Office Petty Cash' } });
    fireEvent.change(screen.getByLabelText('Opening Balance'), { target: { value: '2500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Account' }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
    expect(mocks.mutate.mock.calls[0][0]).toEqual({ account_kind: 'petty_cash', account_name: 'Office Petty Cash', opening_balance: 2500 });
  });

  it('labels petty cash by its name and a bank by its last four digits', () => {
    expect(accountLabel({ bank_name: 'Office Petty Cash', account_number: null, account_kind: 'petty_cash', account_name: 'Office Petty Cash' })).toBe('Office Petty Cash');
    expect(accountLabel({ bank_name: 'Canara Bank', account_number: '000123456781' })).toBe('Canara Bank (6781)');
  });
});
