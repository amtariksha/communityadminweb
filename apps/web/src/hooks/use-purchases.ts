'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PurchaseRequest, VendorBill } from '@communityos/shared';
import { ledgerKeys } from '@/hooks/use-ledger';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

interface VendorAgingEntry {
  vendor_id: string;
  vendor_name: string;
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  over_90: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

interface PurchaseRequestFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface VendorBillFilters {
  status?: string;
  vendor_id?: string;
  page?: number;
  limit?: number;
}

interface VendorPaymentFilters {
  vendor_id?: string;
  start_date?: string;
  end_date?: string;
  payment_mode?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface ApprovePRInput {
  comments?: string;
  level: number;
}

interface RejectPRInput {
  comments: string;
  level: number;
}

// Phase D.1 — edit bill metadata (only allowed before any payment).
interface EditBillInput {
  bill_number?: string;
  bill_date?: string;
  due_date?: string;
  total_amount?: number;
  expense_account_id?: string;
  payable_account_id?: string;
  gst_amount?: number;
  tds_amount?: number;
  narration?: string;
}

interface CancelBillInput {
  reason: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const purchaseKeys = {
  all: ['purchases'] as const,

  requests: () => [...purchaseKeys.all, 'requests'] as const,
  requestList: (filters?: PurchaseRequestFilters) =>
    [...purchaseKeys.requests(), 'list', filters] as const,
  request: (id: string) => [...purchaseKeys.requests(), id] as const,

  bills: () => [...purchaseKeys.all, 'bills'] as const,
  billList: (filters?: VendorBillFilters) =>
    [...purchaseKeys.bills(), 'list', filters] as const,
  bill: (id: string) => [...purchaseKeys.bills(), id] as const,

  // Standalone vendor-payments list. Distinct from the per-bill
  // payments summary that comes nested under bills() — this is the
  // place to see every payment regardless of bill linkage (Tally
  // direct-expense payments have vendor_bill_id=NULL).
  payments: () => [...purchaseKeys.all, 'payments'] as const,
  paymentList: (filters?: VendorPaymentFilters) =>
    [...purchaseKeys.payments(), 'list', filters] as const,

  aging: () => [...purchaseKeys.all, 'aging'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function prFiltersToParams(
  filters?: PurchaseRequestFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

function billFiltersToParams(
  filters?: VendorBillFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.vendor_id) params.vendor_id = filters.vendor_id;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Purchase Request queries
// ---------------------------------------------------------------------------

export function usePurchaseRequests(filters?: PurchaseRequestFilters) {
  return useQuery({
    queryKey: purchaseKeys.requestList(filters),
    queryFn: function fetchPurchaseRequests() {
      return api.get<PaginatedResponse<PurchaseRequest>>('/purchases/requests', {
        params: prFiltersToParams(filters),
      });
    },
  });
}

export function usePurchaseRequest(id: string) {
  return useQuery({
    queryKey: purchaseKeys.request(id),
    queryFn: function fetchPurchaseRequest() {
      return api
        .get<{ data: PurchaseRequest }>(`/purchases/requests/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

// ---------------------------------------------------------------------------
// Purchase Request mutations
// ---------------------------------------------------------------------------

export function useApprovePR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function approvePR(params: { id: string; data?: ApprovePRInput }) {
      return api.post<{ data: PurchaseRequest }>(
        `/purchases/requests/${params.id}/approve`,
        params.data,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.request(variables.id) });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.requests() });
    },
  });
}

export function useRejectPR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function rejectPR(params: { id: string; data: RejectPRInput }) {
      return api.post<{ data: PurchaseRequest }>(
        `/purchases/requests/${params.id}/reject`,
        params.data,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.request(variables.id) });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.requests() });
    },
  });
}

// ---------------------------------------------------------------------------
// Vendor Bill queries
// ---------------------------------------------------------------------------

export function useVendorBills(filters?: VendorBillFilters) {
  return useQuery({
    queryKey: purchaseKeys.billList(filters),
    queryFn: function fetchVendorBills() {
      return api.get<PaginatedResponse<VendorBill>>('/purchases/bills', {
        params: billFiltersToParams(filters),
      });
    },
  });
}

export function useVendorBill(id: string) {
  return useQuery({
    queryKey: purchaseKeys.bill(id),
    queryFn: function fetchVendorBill() {
      return api
        .get<{ data: VendorBill }>(`/purchases/bills/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

export function useVendorAging() {
  return useQuery({
    queryKey: purchaseKeys.aging(),
    queryFn: function fetchVendorAging() {
      return api
        .get<{ data: VendorAgingEntry[] }>('/purchases/aging')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Vendor Bill mutations
// ---------------------------------------------------------------------------

// Phase D.1 — edit a bill (allowed before any payment).
export function useEditBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function editBill(params: { id: string; data: EditBillInput }) {
      return api.patch<{ data: VendorBill }>(
        `/purchases/bills/${params.id}`,
        params.data,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.bill(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.aging() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

// Phase D.1 — cancel a bill (reverses the JE).
export function useCancelBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function cancelBill(params: { id: string; data: CancelBillInput }) {
      return api.post<{ data: VendorBill }>(
        `/purchases/bills/${params.id}/cancel`,
        params.data,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.bill(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.aging() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}
