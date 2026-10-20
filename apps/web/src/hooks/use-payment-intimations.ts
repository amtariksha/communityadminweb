'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { invoiceKeys } from '@/hooks/use-invoices';
import { receiptKeys } from '@/hooks/use-receipts';
import { unitLedgerKeys } from '@/hooks/use-unit-ledger';

/**
 * Paid intimations (INC-65): payments residents reported, waiting for the
 * office. GET /payment-intimations, :id/proof, :id/confirm, :id/reject.
 * New routes: a 404 before the API is deployed is "not available yet".
 */
export type IntimationStatus = 'pending' | 'confirmed' | 'rejected';
export type IntimationScope = 'member' | 'utility';

export interface PaymentIntimation {
  id: string;
  unit_id: string;
  unit_number: string;
  block: string | null;
  reported_by: string | null;
  amount: number;
  paid_on: string;
  mode: string;
  reference: string | null;
  bank: string | null;
  note: string | null;
  has_proof: boolean;
  scope: IntimationScope;
  status: IntimationStatus;
  receipt_id: string | null;
  receipt_number: string | null;
  reject_reason: string | null;
  created_at: string;
}

export interface IntimationFilters {
  status: IntimationStatus | '';
  scope: IntimationScope | '';
  search: string;
  page: number;
  limit: number;
}

export interface IntimationList {
  data: PaymentIntimation[];
  total: number;
  counts: Record<IntimationStatus, number>;
}

export interface ConfirmInput {
  id: string;
  receipt_id?: string;
  receipt_date?: string;
  bank_account_id?: string | null;
  reference?: string;
}

export const intimationKeys = {
  all: ['payment-intimations'] as const,
  list: (filters: IntimationFilters) => [...intimationKeys.all, filters] as const,
  waiting: (scope: IntimationScope) => [...intimationKeys.all, 'waiting', scope] as const,
};

export function intimationParams(filters: IntimationFilters): Record<string, string> {
  const params: Record<string, string> = { page: String(filters.page), limit: String(filters.limit) };
  if (filters.status) params.status = filters.status;
  if (filters.scope) params.scope = filters.scope;
  if (filters.search.trim()) params.q = filters.search.trim();
  return params;
}

export function usePaymentIntimations(filters: IntimationFilters) {
  return useQuery({
    queryKey: intimationKeys.list(filters),
    queryFn: () => api.get<IntimationList>('/payment-intimations', { params: intimationParams(filters) }),
    placeholderData: keepPreviousData,
    meta: { suppressToast: true },
    retry: false,
  });
}

/** How many intimations wait for the office; null on an API without them. */
export function useWaitingIntimations(scope: IntimationScope, enabled = true) {
  return useQuery({
    queryKey: intimationKeys.waiting(scope),
    enabled,
    meta: { suppressToast: true },
    retry: false,
    queryFn: async (): Promise<number | null> => {
      try {
        const list = await api.get<IntimationList>('/payment-intimations', { params: { status: 'pending', scope, limit: '1' } });
        return list.counts.pending;
      } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
        throw error;
      }
    },
  });
}

function useIntimationMutation<Input>(fn: (input: Input) => Promise<{ data: PaymentIntimation }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of [intimationKeys.all, receiptKeys.all, invoiceKeys.all, unitLedgerKeys.all]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useConfirmIntimation() {
  return useIntimationMutation(({ id, ...body }: ConfirmInput) => api.post<{ data: PaymentIntimation }>(`/payment-intimations/${id}/confirm`, body));
}

export function useRejectIntimation() {
  return useIntimationMutation(({ id, reason }: { id: string; reason: string }) => api.post<{ data: PaymentIntimation }>(`/payment-intimations/${id}/reject`, { reason }));
}

export async function intimationProofUrl(id: string): Promise<string> {
  return (await api.get<{ data: { url: string } }>(`/payment-intimations/${id}/proof`)).data.url;
}
