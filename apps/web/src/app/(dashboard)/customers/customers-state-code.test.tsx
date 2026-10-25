import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomersContent from './customers-content';

/** R5-STATECODE — Add customer refuses a state code off the GST list or one that disagrees with the GSTIN. */

const mocks = vi.hoisted(() => ({ create: vi.fn(), toast: vi.fn() }));

vi.mock('@/hooks', () => ({
  useCustomers: () => ({ data: { data: [], total: 0 }, isLoading: false }),
  useCustomer: () => ({ data: undefined, isLoading: false }),
  useCreateCustomer: () => ({ mutate: mocks.create, isPending: false }),
  useUpdateCustomer: () => ({ mutate: vi.fn(), isPending: false }),
  useDeactivateCustomer: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.toast }) }));
vi.mock('./convert-to-unit-dialog', () => ({ ConvertToUnitDialog: () => null }));

function fillAndSubmit(stateCode: string, gstin: string): void {
  render(<CustomersContent />);
  fireEvent.click(screen.getByRole('button', { name: /New Customer/ }));
  fireEvent.change(screen.getByLabelText(/^Display name/), { target: { value: 'Test Hall Hire' } });
  fireEvent.change(screen.getByLabelText(/^State code/), { target: { value: stateCode } });
  fireEvent.change(screen.getByLabelText('GSTIN'), { target: { value: gstin } });
  fireEvent.click(screen.getByRole('button', { name: 'Add customer' }));
}

describe('Add customer state code', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses a one-digit state code', () => {
    fillAndSubmit('7', '');
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Enter the two-digit GST state code, e.g. 29 for Karnataka' }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('refuses a GSTIN that does not start with the state code', () => {
    fillAndSubmit('27', '29ABCDE1234F1Z5');
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'The GSTIN starts with 29 but the state code is 27. They must match.' }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('saves a matching state code and GSTIN', () => {
    fillAndSubmit('29', '29ABCDE1234F1Z5');
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ state_code: '29', gstin: '29ABCDE1234F1Z5' }),
      expect.anything(),
    );
  });
});
