import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InterestCard } from './interest-card';

const TENANT = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  mutate: vi.fn(),
  settings: {} as Record<string, unknown>,
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/hooks/use-tenants', () => ({
  useTenant: () => ({ data: { id: TENANT, settings_json: mocks.settings } }),
  useTenantSettings: () => ({ mutate: mocks.mutate, isPending: false }),
}));

function signIn(role: string, isSuperAdmin = false): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({
      id: 'user-1',
      name: 'Test Admin',
      phone: '+910000000010',
      isSuperAdmin,
      role,
      societies: [{ id: TENANT, name: 'Test Society', role }],
    }),
  );
}

const rateInput = () => screen.getByLabelText('Simple interest (% a year)') as HTMLInputElement;
const daysInput = () => screen.getByLabelText('Due date (in days)') as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: 'Save interest settings' }) as HTMLButtonElement;

beforeEach(() => {
  mocks.settings = {};
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('InterestCard', () => {
  it('shows 18% and 10 days, counted from the due date, when nothing is saved', () => {
    signIn('community_admin');
    render(<InterestCard />);

    expect(rateInput().value).toBe('18');
    expect(daysInput().value).toBe('10');
    expect((screen.getByLabelText('Due date') as HTMLInputElement).checked).toBe(true);
    expect(saveButton().disabled).toBe(true);
  });

  it('saves the whole object and keeps keys the form does not edit', () => {
    mocks.settings = { billing_interest: { rate_pa: 18, due_days: 10, basis: 'due_date', hsn_sac: '997212' } };
    signIn('community_admin');
    render(<InterestCard />);

    fireEvent.change(rateInput(), { target: { value: '15' } });
    fireEvent.change(daysInput(), { target: { value: '20' } });
    fireEvent.click(screen.getByLabelText('Invoice date'));
    fireEvent.click(saveButton());

    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        tenant_id: TENANT,
        settings: {
          billing_interest: {
            rate_pa: 15,
            due_days: 20,
            basis: 'invoice_date',
            start_date: null,
            hsn_sac: '997212',
          },
        },
      },
      expect.anything(),
    );
  });

  it('will not save a rate above 36%', () => {
    signIn('community_admin');
    render(<InterestCard />);

    fireEvent.change(rateInput(), { target: { value: '40' } });

    expect(screen.getByText('Enter a rate from 0 to 36.')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('reports a server that dropped the setting instead of claiming success', () => {
    signIn('community_admin');
    render(<InterestCard />);
    fireEvent.change(rateInput(), { target: { value: '15' } });
    fireEvent.click(saveButton());

    const { onSuccess } = mocks.mutate.mock.calls[0][1];
    onSuccess({ settings_json: {} });

    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Interest settings not saved', variant: 'destructive' }),
    );
  });

  it('confirms once the server keeps the setting', () => {
    signIn('community_admin');
    render(<InterestCard />);
    fireEvent.change(rateInput(), { target: { value: '15' } });
    fireEvent.click(saveButton());

    const { onSuccess } = mocks.mutate.mock.calls[0][1];
    onSuccess({ settings_json: { billing_interest: { rate_pa: 15, due_days: 10, basis: 'due_date' } } });

    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Interest settings saved', variant: 'success' }),
    );
  });

  it('is hidden from roles the server would refuse', () => {
    signIn('accountant');
    const { container } = render(<InterestCard />);
    expect(container.innerHTML).toBe('');
  });
});
