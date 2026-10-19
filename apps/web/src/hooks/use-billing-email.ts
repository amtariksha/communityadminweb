'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Whether the server can send e-mail (public /health/email): Setup › Notifications says so when it cannot. */
export function useEmailTransport() {
  return useQuery({
    queryKey: ['health', 'email'],
    meta: { suppressToast: true },
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: function fetchEmailTransport() {
      return api.get<{ enabled: boolean; from: string }>('/health/email');
    },
  });
}

// ---------------------------------------------------------------------------
// INC-31 — Email Status Monitor
// ---------------------------------------------------------------------------

export type BillingEmailStatus = 'queued' | 'sent' | 'failed' | 'skipped_no_email' | 'skipped_disabled';

export interface BillingEmailRow {
  id: string;
  name: string | null;
  unit_label: string | null;
  email: string | null;
  subject: string;
  sent_date: string;
  status: BillingEmailStatus;
  notes: string | null;
  document_type: string;
  document_id: string;
}

export interface BillingEmailFilters {
  email?: string;
  subject?: string;
  from?: string;
  to?: string;
  q?: string;
  page: number;
  limit: number;
}

export function billingEmailParams(filters: Omit<BillingEmailFilters, 'page' | 'limit'>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const key of ['email', 'subject', 'from', 'to', 'q'] as const) {
    const value = filters[key]?.trim();
    if (value) params[key] = value;
  }
  return params;
}

export function useBillingEmailLog(filters: BillingEmailFilters, enabled = true) {
  return useQuery({
    queryKey: ['billing-email-log', filters],
    enabled,
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchBillingEmailLog() {
      return api.get<{ data: BillingEmailRow[]; total: number }>('/billing-email-log', {
        params: { ...billingEmailParams(filters), page: String(filters.page), limit: String(filters.limit) },
      });
    },
  });
}

export function useResendBillingEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function resend(id: string) {
      return api.post<{ data: { status: BillingEmailStatus; error: string | null } }>(`/billing-email-log/${id}/resend`).then((res) => res.data);
    },
    onSuccess: function refresh() {
      queryClient.invalidateQueries({ queryKey: ['billing-email-log'] });
    },
  });
}
