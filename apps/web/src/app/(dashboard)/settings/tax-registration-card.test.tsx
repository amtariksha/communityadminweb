import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaxRegistrationCard } from './tax-registration-card';

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

const gstinInput = () => screen.getByLabelText('GSTIN') as HTMLInputElement;
const panInput = () => screen.getByLabelText('PAN') as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: 'Save tax registration' }) as HTMLButtonElement;

beforeEach(() => {
  mocks.settings = {};
  signIn('community_admin');
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('TaxRegistrationCard', () => {
  it('shows what is saved and nothing to save yet', () => {
    mocks.settings = { gstin: '29ABCDE1234F1Z5', pan: 'ABCDE1234F' };
    render(<TaxRegistrationCard />);

    expect(gstinInput().value).toBe('29ABCDE1234F1Z5');
    expect(panInput().value).toBe('ABCDE1234F');
    expect(saveButton().disabled).toBe(true);
  });

  it('saves the three values, upper-cased, and sends null for a blank one', () => {
    render(<TaxRegistrationCard />);

    fireEvent.change(gstinInput(), { target: { value: '29abcde1234f1z5' } });
    fireEvent.change(screen.getByLabelText('Society registration no.'), { target: { value: 'REG/2015/0042' } });
    fireEvent.click(saveButton());

    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        tenant_id: TENANT,
        settings: { gstin: '29ABCDE1234F1Z5', pan: null, society_registration_no: 'REG/2015/0042' },
      },
      expect.anything(),
    );
  });

  it('will not save a malformed GSTIN', () => {
    render(<TaxRegistrationCard />);

    fireEvent.change(gstinInput(), { target: { value: '29ABCDE1234F1Z' } });

    expect(screen.getByText('GSTIN must be 15 characters, e.g. 29ABCDE1234F1Z5.')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('reports a server that dropped the setting instead of claiming success', () => {
    render(<TaxRegistrationCard />);
    fireEvent.change(gstinInput(), { target: { value: '29ABCDE1234F1Z5' } });
    fireEvent.click(saveButton());

    mocks.mutate.mock.calls[0][1].onSuccess({ settings_json: {} });

    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tax registration not saved', variant: 'destructive' }),
    );
  });

  it('confirms once the server keeps the values', () => {
    render(<TaxRegistrationCard />);
    fireEvent.change(gstinInput(), { target: { value: '29ABCDE1234F1Z5' } });
    fireEvent.click(saveButton());

    mocks.mutate.mock.calls[0][1].onSuccess({ settings_json: { gstin: '29ABCDE1234F1Z5' } });

    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tax registration saved', variant: 'success' }),
    );
  });

  it('is hidden from roles the server would refuse', () => {
    signIn('accountant');
    const { container } = render(<TaxRegistrationCard />);
    expect(container.innerHTML).toBe('');
  });
});
