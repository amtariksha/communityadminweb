import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WaiveInterestButton } from './waive-interest-button';

const TENANT = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/hooks', () => ({ useWaiveInterest: () => ({ mutate: mocks.mutate, isPending: false }) }));

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({
      id: 'user-1',
      name: 'Test Admin',
      phone: '+910000000010',
      isSuperAdmin: false,
      role,
      societies: [{ id: TENANT, name: 'Test Society', role }],
    }),
  );
}

beforeEach(() => signIn('accountant'));
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('WaiveInterestButton', () => {
  it('shows the interest and a Waive interest button when the invoice carries interest', () => {
    render(<WaiveInterestButton invoiceId="inv-1" lpiAmount={147.95} />);

    expect(screen.getByText(/Interest/)).toBeTruthy();
    expect(screen.getByText(/147\.95/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Waive interest' })).toBeTruthy();
  });

  it('renders nothing when there is no interest', () => {
    const { container } = render(<WaiveInterestButton invoiceId="inv-1" lpiAmount={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the interest but no button to a role the server would refuse', () => {
    signIn('committee_member');
    render(<WaiveInterestButton invoiceId="inv-1" lpiAmount={147.95} />);

    expect(screen.getByText(/147\.95/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Waive interest' })).toBeNull();
  });

  it('asks for confirmation before waiving, then calls the API and reports the credit note', () => {
    render(<WaiveInterestButton invoiceId="inv-1" lpiAmount={147.95} />);

    fireEvent.click(screen.getByRole('button', { name: 'Waive interest' }));
    expect(mocks.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Waive ₹147.95' }));

    expect(mocks.mutate).toHaveBeenCalledWith('inv-1', expect.anything());
    const { onSuccess } = mocks.mutate.mock.calls[0][1];
    onSuccess({ data: { credit_note_number: 'CN-0007', amount_waived: 147.95 } });
    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Interest waived', variant: 'success' }),
    );
  });
});
