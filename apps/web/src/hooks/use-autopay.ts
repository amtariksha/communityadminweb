'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutopaySubscription {
  id: string;
  tenant_id: string;
  unit_id: string;
  member_id: string;
  razorpay_subscription_id: string;
  status: string;
  auth_method: string;
  upi_vpa: string | null;
  start_at: string | null;
  total_charges: number;
  failed_charges: number;
  paused_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  unit_number?: string;
  member_name?: string;
  plan_amount?: number;
  rule_name?: string;
}

export interface AutopayCharge {
  id: string;
  subscription_id: string;
  invoice_ids: string[];
  razorpay_payment_id: string | null;
  amount: number;
  status: string;
  failure_reason: string | null;
  charged_at: string | null;
  created_at: string;
  unit_number?: string;
  rule_name?: string;
}

export interface AutopayFilters {
  status?: string;
  unit_id?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const autopayKeys = {
  all: ['autopay'] as const,
  subscriptions: () => [...autopayKeys.all, 'subscriptions'] as const,
  subscriptionList: (filters?: AutopayFilters) =>
    [...autopayKeys.subscriptions(), filters] as const,
  subscription: (id: string) => [...autopayKeys.subscriptions(), id] as const,
  unitSubs: (unitId: string) => [...autopayKeys.all, 'unit', unitId] as const,
  charges: () => [...autopayKeys.all, 'charges'] as const,
  chargeList: (filters?: AutopayFilters) =>
    [...autopayKeys.charges(), filters] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useAutopaySubscriptions(filters?: AutopayFilters) {
  return useQuery({
    queryKey: autopayKeys.subscriptionList(filters),
    queryFn: function fetchSubs() {
      const params: Record<string, string> = {};
      if (filters?.status) params.status = filters.status;
      if (filters?.unit_id) params.unit_id = filters.unit_id;
      if (filters?.page !== undefined) params.page = String(filters.page);
      if (filters?.limit !== undefined) params.limit = String(filters.limit);
      return api.get<{ data: AutopaySubscription[]; total: number }>(
        '/payments/autopay/subscriptions',
        { params },
      );
    },
  });
}

export function useAutopaySubscription(id: string) {
  return useQuery({
    queryKey: autopayKeys.subscription(id),
    queryFn: function fetchSub() {
      return api
        .get<{ data: AutopaySubscription }>(
          `/payments/autopay/subscriptions/${id}`,
        )
        .then((res) => res.data);
    },
    enabled: id !== '',
  });
}

export function useUnitSubscriptions(unitId: string) {
  return useQuery({
    queryKey: autopayKeys.unitSubs(unitId),
    queryFn: function fetchUnitSubs() {
      return api
        .get<{ data: AutopaySubscription[] }>(
          `/payments/autopay/unit/${unitId}`,
        )
        .then((res) => res.data);
    },
    enabled: unitId !== '',
  });
}

export function useAutopayCharges(filters?: AutopayFilters) {
  return useQuery({
    queryKey: autopayKeys.chargeList(filters),
    queryFn: function fetchCharges() {
      const params: Record<string, string> = {};
      if (filters?.page !== undefined) params.page = String(filters.page);
      if (filters?.limit !== undefined) params.limit = String(filters.limit);
      return api.get<{ data: AutopayCharge[]; total: number }>(
        '/payments/autopay/charges',
        { params },
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateAutopaySubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createSub(input: {
      invoice_rule_id: string;
      unit_id: string;
    }) {
      return api.post<{
        data: { subscription: AutopaySubscription; short_url: string };
      }>('/payments/autopay/subscribe', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: autopayKeys.subscriptions() });
    },
  });
}

export function usePauseSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function pauseSub(id: string) {
      return api.post(`/payments/autopay/subscriptions/${id}/pause`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: autopayKeys.subscriptions() });
    },
  });
}

export function useResumeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function resumeSub(id: string) {
      return api.post(`/payments/autopay/subscriptions/${id}/resume`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: autopayKeys.subscriptions() });
    },
  });
}

export function useCancelAutopaySubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function cancelSub({
      id,
      reason,
    }: {
      id: string;
      reason?: string;
    }) {
      return api.post(`/payments/autopay/subscriptions/${id}/cancel`, {
        reason,
      });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: autopayKeys.subscriptions() });
    },
  });
}
