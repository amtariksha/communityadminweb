import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OtpProviderSettings } from '@/hooks/use-otp-provider';
import { OtpSettings } from './otp-settings';

/**
 * OTP & Messaging reads and writes `/super-admin/otp-provider`. It used to be
 * filled from the masked settings list and saved everything back, writing
 * masks and blanks over the stored keys and the server environment. Now only
 * the fields changed are sent, secrets are never shown, and a saved field can
 * go back to the server environment.
 */

const mocks = vi.hoisted(() => ({
  data: null as OtpProviderSettings | null,
  mutate: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock('@/hooks/use-otp-provider', () => ({
  useOtpProviderSettings: () => ({ isLoading: false, isError: false, error: null, data: mocks.data }),
  useUpdateOtpProviderSettings: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

const SETTINGS: OtpProviderSettings = {
  primary: { source: 'environment', value: 'whatsapp' },
  sms_provider: { source: 'saved', value: 'msg91' },
  'whatsapp_cloud.phoneNumberId': { source: 'environment', value: '100000000000007' },
  'whatsapp_cloud.accessToken': { source: 'environment' },
  'whatsapp_cloud.templateName': { source: 'environment', value: 'otp_verification' },
  'msg91.authKey': { source: 'saved' },
  'msg91.templateId': { source: 'environment', value: 'envtemplate0001' },
  'msg91.otpLength': { source: 'environment', value: 6 },
  '2factor.apiKeyHeader': { source: 'not_set' },
  '2factor.baseUrl': { source: 'environment', value: 'https://2factor.in/API/V1' },
  '2factor.apiKey': { source: 'not_set' },
};

const save = (): void => {
  fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
};

describe('OtpSettings', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.data = SETTINGS;
  });

  it('shows where each field comes from and never a secret', () => {
    render(<OtpSettings />);

    expect(screen.getByTestId('otp-msg91-authKey-state').textContent).toContain('Saved here');
    expect(screen.getByTestId('otp-whatsapp_cloud-accessToken-state').textContent).toContain('Server environment');
    expect(screen.getByTestId('otp-2factor-apiKey-state').textContent).toContain('Not set');
    expect((screen.getByLabelText('Auth Key') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Access Token') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Template ID') as HTMLInputElement).value).toBe('envtemplate0001');
  });

  it('sends nothing to change when saved untouched', () => {
    render(<OtpSettings />);

    save();

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate.mock.calls[0][0]).toEqual({});
  });

  it('sends only the fields changed, never an environment value it was shown', () => {
    render(<OtpSettings />);

    fireEvent.change(screen.getByLabelText('Primary Channel'), { target: { value: 'sms' } });
    fireEvent.change(screen.getByLabelText('Account API Key'), { target: { value: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' } });
    fireEvent.change(screen.getByLabelText('OTP Length'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Access Token'), { target: { value: '   ' } });
    save();

    expect(mocks.mutate.mock.calls[0][0]).toEqual({
      set: { primary: 'sms', '2factor.apiKey': 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
    });
  });

  it('puts a saved field back to the server environment', () => {
    render(<OtpSettings />);

    const state = screen.getByTestId('otp-msg91-authKey-state');
    fireEvent.click(state.querySelector('button') as HTMLButtonElement);
    save();

    expect(mocks.mutate.mock.calls[0][0]).toEqual({ use_environment: ['msg91.authKey'] });
  });

  it('says the settings are not available on a server without the route', () => {
    mocks.data = null;
    render(<OtpSettings />);

    expect(screen.getByText('OTP settings are not available yet on this server.')).toBeTruthy();
    expect(screen.queryByLabelText('Auth Key')).toBeNull();
  });
});
