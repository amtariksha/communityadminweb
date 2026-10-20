'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * Super admin › Platform settings › Payments (Q2): the Razorpay credentials
 * the API uses (`GET/PATCH /super-admin/payment-provider`). Secrets never come
 * back — each is reported as saved here, from the server environment, or not
 * set. `null` on a server without the route yet (404).
 */
export type PaymentValueSource = 'saved' | 'environment';
export type PaymentSettingState = PaymentValueSource | 'not_set';

export interface PaymentProviderSettings {
  keyId: string;
  keyIdSource: PaymentSettingState;
  keySecret: PaymentSettingState;
  webhookSecret: PaymentSettingState;
  platformFeePercent: number;
  platformFeeSource: PaymentValueSource;
}

export interface PaymentProviderUpdate {
  keyId: string;
  // Left out = keep the secret in use.
  keySecret?: string;
  webhookSecret?: string;
  platformFeePercent?: number;
}

export const paymentProviderKeys = {
  all: ['payment-provider'] as const,
};

export function usePaymentProviderSettings() {
  return useQuery({
    queryKey: paymentProviderKeys.all,
    meta: { suppressToast: true },
    retry: false,
    queryFn: async (): Promise<PaymentProviderSettings | null> => {
      try {
        return (await api.get<{ data: PaymentProviderSettings }>('/super-admin/payment-provider')).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useUpdatePaymentProviderSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PaymentProviderUpdate) =>
      api.patch<{ data: PaymentProviderSettings }>('/super-admin/payment-provider', body).then((res) => res.data),
    onSuccess(settings) {
      queryClient.setQueryData(paymentProviderKeys.all, settings);
    },
  });
}
