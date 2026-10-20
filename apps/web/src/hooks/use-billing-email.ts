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

// ---------------------------------------------------------------------------
// INC-22 — Send Email on a statement (a unit's, or a payer's, INC-46)
// ---------------------------------------------------------------------------

export interface StatementEmailInput {
  /** A unit's members to send to; left out = the unit's recipients per Setup › Notifications. A payer's goes to its e-mail. */
  member_ids?: string[];
  subject?: string;
  /** Plain text, put above the attached-statement line. */
  message?: string;
  from?: string;
  to?: string;
  scope?: 'member' | 'utility' | 'all';
}

/** One billing_email_log row per recipient. */
export interface StatementEmailResult {
  id: string;
  recipient_name: string | null;
  recipient_email: string | null;
  subject: string;
  status: BillingEmailStatus;
  error: string | null;
}

/** POST /unit-ledger/{units|customers}/:id/statement/email; off (409 statement_email_off) until Setup › Notifications ticks it. */
export function useSendStatementEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, body }: { path: string; body: StatementEmailInput }) =>
      api.post<{ data: StatementEmailResult[] }>(`${path}/email`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing-email-log'] });
    },
  });
}
