import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlatformSettings from './platform-settings';

/**
 * Q2 — Platform settings offers only what the API reads: OTP & Messaging
 * (otp_provider), Payments (its own route) and Tax Defaults. Storage, Push
 * Notifications, Email and Branding saved keys nothing reads and are gone.
 */

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('@/hooks', () => ({
  usePlatformConfig: () => ({ isLoading: false, isError: false, data: [], refetch: vi.fn() }),
  useUpdatePlatformConfig: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/super-admin/payments-settings', () => ({
  PaymentsSettings: () => <p>payments settings</p>,
}));
vi.mock('@/components/super-admin/gst-rates-editor', () => ({ GstRatesEditor: () => null }));
vi.mock('@/components/tds/tds-config-editor', () => ({ TdsConfigEditor: () => null }));

describe('PlatformSettings', () => {
  it('offers OTP & Messaging, Payments and Tax Defaults only', () => {
    render(<PlatformSettings />);

    const tabs = screen.getAllByRole('button').map((button) => button.textContent?.trim());
    expect(tabs.slice(0, 3)).toEqual(['OTP & Messaging', 'Payments', 'Tax Defaults']);
    for (const gone of ['Storage', 'Push Notifications', 'Email', 'Branding']) {
      expect(screen.queryByRole('button', { name: gone })).toBeNull();
    }
  });

  it('shows the Payments settings on their own route, not the generic config save', () => {
    render(<PlatformSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Payments' }));

    expect(screen.getByText('payments settings')).toBeTruthy();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
