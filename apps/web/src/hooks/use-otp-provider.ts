'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * Super admin › Platform settings › OTP & Messaging: the settings the OTP
 * dispatcher reads (`GET/PATCH /super-admin/otp-provider`), field by field
 * over the server environment. Secrets never come back, only where they
 * come from. `null` on a server without the route yet (404).
 */
export const OTP_FIELDS = [
  'primary',
  'sms_provider',
  'whatsapp_cloud.phoneNumberId',
  'whatsapp_cloud.accessToken',
  'whatsapp_cloud.templateName',
  'msg91.authKey',
  'msg91.templateId',
  'msg91.otpLength',
  '2factor.apiKeyHeader',
  '2factor.baseUrl',
  '2factor.apiKey',
] as const;

export type OtpField = (typeof OTP_FIELDS)[number];
export type OtpSettingState = 'saved' | 'environment' | 'not_set';

export interface OtpFieldStatus {
  source: OtpSettingState;
  // Absent for secrets and for fields with no value.
  value?: string | number;
}

export type OtpProviderSettings = Record<OtpField, OtpFieldStatus>;

export interface OtpProviderUpdate {
  // Only the fields changed; anything left out keeps what is in use.
  set?: Partial<Record<OtpField, string | number>>;
  // Saved fields to drop, so the server environment applies again.
  use_environment?: OtpField[];
}

export const otpProviderKeys = {
  all: ['otp-provider'] as const,
};

export function useOtpProviderSettings() {
  return useQuery({
    queryKey: otpProviderKeys.all,
    meta: { suppressToast: true },
    retry: false,
    queryFn: async (): Promise<OtpProviderSettings | null> => {
      try {
        return (await api.get<{ data: OtpProviderSettings }>('/super-admin/otp-provider')).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useUpdateOtpProviderSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OtpProviderUpdate) =>
      api.patch<{ data: OtpProviderSettings }>('/super-admin/otp-provider', body).then((res) => res.data),
    onSuccess(settings) {
      queryClient.setQueryData(otpProviderKeys.all, settings);
    },
  });
}
