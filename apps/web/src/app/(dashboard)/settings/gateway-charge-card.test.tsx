import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GatewayChargeCard } from './gateway-charge-card';

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

const payerBox = () => screen.getByLabelText('Society pays the gateway charge') as HTMLInputElement;
const percentInput = () => screen.getByLabelText('Gateway charge (%)') as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: 'Save online payment charges' }) as HTMLButtonElement;

beforeEach(() => {
  mocks.settings = {};
  signIn('community_admin');
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('GatewayChargeCard', () => {
  it('shows what is saved', () => {
    mocks.settings = { gateway_fee_mode: 'absorbed', gateway_fee_percent: 2 };
    render(<GatewayChargeCard />);

    expect(payerBox().checked).toBe(true);
    expect(percentInput().value).toBe('2');
    expect(saveButton().disabled).toBe(true);
  });

  it('saves "residents pay 2%"', () => {
    render(<GatewayChargeCard />);

    fireEvent.change(percentInput(), { target: { value: '2' } });
    fireEvent.click(saveButton());

    expect(mocks.mutate).toHaveBeenCalledWith(
      { tenant_id: TENANT, settings: { gateway_fee_mode: 'pass_through', gateway_fee_percent: 2 } },
      expect.anything(),
    );
  });

  it('saves "society pays" without needing a percent', () => {
    render(<GatewayChargeCard />);

    fireEvent.click(payerBox());
    fireEvent.click(saveButton());

    expect(mocks.mutate).toHaveBeenCalledWith(
      { tenant_id: TENANT, settings: { gateway_fee_mode: 'absorbed' } },
      expect.anything(),
    );
  });

  it('will not save a charge above 5%', () => {
    render(<GatewayChargeCard />);

    fireEvent.change(percentInput(), { target: { value: '6' } });

    expect(screen.getByText('Enter a charge from 0 to 5, with at most two decimals.')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('reports a server that dropped the setting instead of claiming success', () => {
    render(<GatewayChargeCard />);
    fireEvent.change(percentInput(), { target: { value: '2' } });
    fireEvent.click(saveButton());

    mocks.mutate.mock.calls[0][1].onSuccess({ settings_json: {} });

    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Online payment charges not saved', variant: 'destructive' }),
    );
  });

  it('is hidden from roles the server would refuse', () => {
    signIn('accountant');
    const { container } = render(<GatewayChargeCard />);
    expect(container.innerHTML).toBe('');
  });
});
