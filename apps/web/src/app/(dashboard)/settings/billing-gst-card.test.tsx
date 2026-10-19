import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingGstCard, readShowGstOnAdhoc } from './billing-gst-card';

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
    JSON.stringify({ id: 'u', name: 'Test Admin', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: TENANT, name: 'S', role }] }),
  );
}

const box = () => screen.getByLabelText('Show the GST option when posting an ad-hoc invoice') as HTMLInputElement;

beforeEach(() => {
  mocks.settings = {};
  signIn('community_admin');
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('BillingGstCard (INC-23)', () => {
  it('reads the option as on unless switched off', () => {
    expect(readShowGstOnAdhoc({})).toBe(true);
    expect(readShowGstOnAdhoc({ billing_gst: { show_on_adhoc: false } })).toBe(false);
    expect(readShowGstOnAdhoc(null)).toBe(true);
  });

  it('switches the option off and saves the whole key', () => {
    render(<BillingGstCard />);
    expect(box().checked).toBe(true);

    fireEvent.click(box());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      { tenant_id: TENANT, settings: { billing_gst: { show_on_adhoc: false } } },
      expect.anything(),
    );
  });

  it('is not shown to someone who cannot save society settings', () => {
    signIn('accountant');
    render(<BillingGstCard />);

    expect(screen.queryByLabelText('Show the GST option when posting an ad-hoc invoice')).toBeNull();
  });
});
