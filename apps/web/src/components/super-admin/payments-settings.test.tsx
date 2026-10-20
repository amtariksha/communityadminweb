import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentProviderSettings } from '@/hooks/use-payment-provider';
import { PaymentsSettings } from './payments-settings';

/**
 * Q2 — Platform settings › Payments reads and writes the credentials the API
 * uses (`/super-admin/payment-provider`). Secrets are only ever "set / not
 * set"; a secret left blank is not sent (the API keeps the one in use); a
 * server without the route says so instead of offering a form.
 */

const mocks = vi.hoisted(() => ({
  query: { isLoading: false, isError: false, error: null as unknown, data: null as PaymentProviderSettings | null },
  mutate: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock('@/hooks/use-payment-provider', () => ({
  usePaymentProviderSettings: () => mocks.query,
  useUpdatePaymentProviderSettings: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

const SAVED: PaymentProviderSettings = {
  keyId: 'rzp_test_demo0001',
  keyIdSource: 'saved',
  keySecret: 'saved',
  webhookSecret: 'environment',
  platformFeePercent: 1.5,
  platformFeeSource: 'saved',
};

describe('PaymentsSettings', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.query = { isLoading: false, isError: false, error: null, data: SAVED };
  });

  it('shows the key id in use and where each secret comes from, never a secret', () => {
    render(<PaymentsSettings />);

    expect((screen.getByLabelText('Key ID') as HTMLInputElement).value).toBe('rzp_test_demo0001');
    expect(screen.getByTestId('payments-key-secret-state').textContent).toBe('Set (saved here)');
    expect(screen.getByTestId('payments-webhook-secret-state').textContent).toBe('Set (server environment)');
    expect((screen.getByLabelText('Key Secret') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Webhook Secret') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Platform Fee %') as HTMLInputElement).value).toBe('1.5');
  });

  it('says "Not set" for a secret the API does not have', () => {
    mocks.query = { ...mocks.query, data: { ...SAVED, keyIdSource: 'not_set', keyId: '', keySecret: 'not_set' } };
    render(<PaymentsSettings />);

    expect(screen.getByTestId('payments-key-id-state').textContent).toBe('Not set');
    expect(screen.getByTestId('payments-key-secret-state').textContent).toBe('Not set');
    expect((screen.getByRole('button', { name: /save/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('sends the key id and fee, and only the secrets typed', () => {
    render(<PaymentsSettings />);

    fireEvent.change(screen.getByLabelText('Platform Fee %'), { target: { value: '2.25' } });
    fireEvent.change(screen.getByLabelText('Webhook Secret'), { target: { value: 'made-up-webhook' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate.mock.calls[0][0]).toEqual({
      keyId: 'rzp_test_demo0001',
      webhookSecret: 'made-up-webhook',
      platformFeePercent: 2.25,
    });
  });

  it('says the settings are not available on a server without the route', () => {
    mocks.query = { ...mocks.query, data: null };
    render(<PaymentsSettings />);

    expect(screen.getByText('Payment settings are not available yet on this server.')).toBeTruthy();
    expect(screen.queryByLabelText('Key ID')).toBeNull();
  });
});
