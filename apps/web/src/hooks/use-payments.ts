'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { receiptKeys } from '@/hooks/use-receipts';
import { invoiceKeys } from '@/hooks/use-invoices';
import { ledgerKeys } from '@/hooks/use-ledger';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_ids: string[];
  unit_id: string | null;
  member_id: string | null;
  amount: number;
  platform_fee: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  status: string;
  payment_method: string | null;
  receipt_id: string | null;
  refund_id: string | null;
  refund_amount: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentStats {
  total_collected: number;
  total_platform_fees: number;
  successful_count: number;
  failed_count: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface PaymentFilters {
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreatePaymentOrderInput {
  invoice_ids: string[];
  unit_id?: string;
  member_id?: string;
}

interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters?: PaymentFilters) => [...paymentKeys.lists(), filters] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
  stats: (startDate: string, endDate: string) =>
    [...paymentKeys.all, 'stats', startDate, endDate] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(filters?: PaymentFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: paymentKeys.list(filters),
    queryFn: function fetchPayments() {
      return api.get<PaginatedResponse<Payment>>('/payments', {
        params: filtersToParams(filters),
      });
    },
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: function fetchPayment() {
      return api
        .get<{ data: Payment }>(`/payments/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

export function usePaymentStats(startDate: string, endDate: string) {
  return useQuery({
    queryKey: paymentKeys.stats(startDate, endDate),
    queryFn: function fetchPaymentStats() {
      return api
        .get<{ data: PaymentStats }>('/payments/stats', {
          params: { start_date: startDate, end_date: endDate },
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: startDate !== '' && endDate !== '',
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreatePaymentOrder() {
  return useMutation({
    mutationFn: function createPaymentOrder(input: CreatePaymentOrderInput) {
      return api.post<{ data: Payment }>('/payments/orders', input);
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function verifyPayment(input: VerifyPaymentInput) {
      return api.post<{ data: Payment }>('/payments/verify', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useInitiateRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function initiateRefund(params: { id: string }) {
      return api.post<{ data: Payment }>(
        `/payments/${params.id}/refund`,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

// QA #27 — manual reconcile button hook. POSTs to /payments/reconcile
// and returns a count summary so the UI can render a toast.
export interface PaymentReconcileSummary {
  scanned: number;
  paid: number;
  failed: number;
  still_pending: number;
}

export function useReconcilePending() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function reconcilePending() {
      return api.post<{ data: PaymentReconcileSummary }>('/payments/reconcile');
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    },
  });
}
