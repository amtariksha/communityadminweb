'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PurchaseRequest, VendorBill, VendorPayment } from '@communityos/shared';
import { vendorKeys } from '@/hooks/use-vendors';
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

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreatePurchaseRequestInput {
  title: string;
  description: string;
  estimated_amount: number;
  vendor_id?: string | null;
}

interface ApprovePRInput {
  comments?: string;
  level: number;
}

interface RejectPRInput {
  comments: string;
  level: number;
}

interface BillLine {
  ledger_account_id: string;
  description: string;
  amount: number;
  gst_rate?: number;
}

interface CreateBillInput {
  vendor_id: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  expense_account_id: string;
  payable_account_id: string;
  bill_number?: string;
  // Phase D.2 — gst_amount was missing from the type even though
  // the backend has always accepted it. Bills now post their GST.
  gst_amount?: number;
  tds_amount?: number;
  narration?: string;
  lines?: BillLine[];
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

interface RecordBillPaymentInput {
  bill_id: string;
  payment_date: string;
  amount: number;
  // Admin-web uses `mode`; accept both to avoid a churn-wide rename.
  mode?: string;
  payment_mode?: string;
  reference_number?: string | null;
  bank_account_id: string | null;
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

export function useCreatePR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createPR(input: CreatePurchaseRequestInput) {
      return api.post<{ data: PurchaseRequest }>('/purchases/requests', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.requests() });
    },
  });
}

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

interface ConvertPRToBillInput {
  vendor_id: string;
  bill_number?: string;
  bill_date: string;
  due_date: string;
  // Gross total (subtotal + GST). Server splits subtotal back out for
  // posting + storage.
  total_amount: number;
  expense_account_id: string;
  payable_account_id: string;
  // GST input claimable on this bill (amount, not rate). Optional;
  // when omitted server treats as 0.
  gst_amount?: number;
  // TDS withheld on this bill (amount). Optional; when omitted server
  // treats as 0.
  tds_amount?: number;
  narration?: string;
}

export function useConvertPRToBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function convertPRToBill(params: {
      id: string;
      data: ConvertPRToBillInput;
    }) {
      return api.post<{ data: VendorBill }>(
        `/purchases/requests/${params.id}/convert`,
        params.data,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.requests() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
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

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createBill(input: CreateBillInput) {
      return api.post<{ data: VendorBill }>('/purchases/bills', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.aging() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

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

export function useRecordBillPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function recordBillPayment(input: RecordBillPaymentInput) {
      return api.post<{ data: VendorPayment }>(
        `/purchases/bills/${input.bill_id}/pay`,
        input,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bill(variables.bill_id) });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.aging() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}
