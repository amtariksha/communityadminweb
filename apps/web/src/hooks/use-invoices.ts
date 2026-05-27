'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Invoice, InvoiceRule } from '@communityos/shared';
import { ledgerKeys } from '@/hooks/use-ledger';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// 2026-05-09 (QA #91) — backend `invoice.service.ts#getDefaulters`
// returns `total_due` (not `total_overdue`) and `invoice_count`
// (not `overdue_months`). The previous interface didn't match the
// server response, so React Query unwrapped fine but the dialog
// rendered "—" for every column. Aligning field names here.
interface Defaulter {
  unit_id: string;
  unit_number: string;
  block: string | null;
  floor?: number | null;
  total_due: string | number;
  invoice_count: number;
  oldest_due_date: string;
  days_overdue?: number;
}

// 2026-05-09 (QA #90) — backend `invoice.service.ts#calculateLPI`
// returns `{ details: LpiRow[]; totalInterest: number }` (object,
// not array) where each detail carries `balance_due` /
// `interest_amount` (not `principal` / `lpi_amount`). The previous
// interface assumed the array-shape from an older API version,
// which left the modal showing the "no overdue invoices" empty
// state even on a 200 with rows. Aligning the type + unwrap.
interface LpiCalculation {
  unit_id: string;
  unit_number: string;
  invoice_id: string;
  invoice_number: string;
  balance_due: string | number;
  due_date: string;
  days_overdue: number;
  interest_amount: string | number;
}

interface LpiResponse {
  details: LpiCalculation[];
  totalInterest: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

interface InvoiceFilters {
  status?: string;
  unit_id?: string;
  start_date?: string;
  end_date?: string;
  /** Free-text search across invoice_number, billing_period, unit_number. */
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateInvoiceRuleInput {
  name: string;
  ledger_account_id: string;
  frequency: string;
  // Backend accepts any one of amount | flat_amount | rate_per_sqft and
  // normalizes via: resolvedAmount = amount ?? flat_amount ?? rate_per_sqft ?? 0.
  // We send whichever matches the selected charge_type, so all three are
  // optional at the type level.
  amount?: number;
  charge_type?: 'flat' | 'area_based' | 'hybrid';
  flat_amount?: number;
  rate_per_sqft?: number;
  fixed_addon?: number;
  gst_rule?: 'none' | 'full' | 'above_limit';
  is_gst_applicable?: boolean;
  gst_rate?: number;
}

interface UpdateInvoiceRuleInput extends Partial<CreateInvoiceRuleInput> {
  is_active?: boolean;
}

interface GenerateInvoicesInput {
  rule_id: string;
  invoice_date: string;
}

interface PostInvoicesInput {
  invoice_ids: string[];
}

interface BulkUpdateDueDatesInput {
  invoice_ids: string[];
  due_date: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters?: InvoiceFilters) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  rules: () => [...invoiceKeys.all, 'rules'] as const,
  defaulters: () => [...invoiceKeys.all, 'defaulters'] as const,
  lpi: (asOfDate: string) => [...invoiceKeys.all, 'lpi', asOfDate] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(filters?: InvoiceFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.unit_id) params.unit_id = filters.unit_id;
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.q && filters.q.trim()) params.q = filters.q.trim();
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  if (filters.sort) params.sort = filters.sort;
  if (filters.dir) params.dir = filters.dir;
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: function fetchInvoices() {
      return api.get<PaginatedResponse<Invoice>>('/invoices', {
        params: filtersToParams(filters),
      });
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: function fetchInvoice() {
      return api
        .get<{ data: Invoice }>(`/invoices/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

export function useInvoiceRules() {
  return useQuery({
    queryKey: invoiceKeys.rules(),
    queryFn: function fetchInvoiceRules() {
      return api
        .get<{ data: InvoiceRule[] }>('/invoices/rules')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useDefaulters() {
  return useQuery({
    queryKey: invoiceKeys.defaulters(),
    queryFn: function fetchDefaulters() {
      return api
        .get<{ data: Defaulter[] }>('/invoices/defaulters')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useCalculateLPI(asOfDate?: string) {
  const date = asOfDate ?? new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: invoiceKeys.lpi(date),
    queryFn: function fetchLpi() {
      return api
        .get<{ data: LpiResponse }>(`/invoices/lpi?as_of_date=${date}`)
        .then(function unwrap(res): LpiResponse {
          // Defensive: older API shape returned `data: LpiCalculation[]`
          // directly. If we ever roll back, don't crash — wrap it.
          if (Array.isArray(res.data)) {
            return {
              details: res.data as unknown as LpiCalculation[],
              totalInterest: 0,
            };
          }
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateInvoiceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createInvoiceRule(input: CreateInvoiceRuleInput) {
      return api.post<{ data: InvoiceRule }>('/invoices/rules', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.rules() });
    },
  });
}

export function useUpdateInvoiceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateInvoiceRule(params: {
      id: string;
      data: UpdateInvoiceRuleInput;
    }) {
      return api.patch<{ data: InvoiceRule }>(
        `/invoices/rules/${params.id}`,
        params.data,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.rules() });
    },
  });
}

export function useGenerateInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function generateInvoices(input: GenerateInvoicesInput) {
      return api.post<{ data: { count: number } }>('/invoices/generate', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function usePostInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function postInvoices(input: PostInvoicesInput) {
      return api.post<{ message: string }>('/invoices/post', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function cancelInvoice(params: { id: string; reason: string }) {
      return api.post<{ data: unknown }>(`/invoices/${params.id}/cancel`, {
        reason: params.reason,
      });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useBulkUpdateDueDates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function bulkUpdateDueDates(input: BulkUpdateDueDatesInput) {
      return api.patch<{ message: string }>('/invoices/due-dates', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function usePostLPI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function postLPI(input: { as_of_date: string }) {
      return api.post<{
        data: { posted_count: number; total_interest: number };
      }>('/invoices/lpi/post', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useWaiveInterest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function waiveInterest(invoiceId: string) {
      return api.post<{
        data: { credit_note_number: string; amount_waived: number };
      }>(`/invoices/${invoiceId}/waive-interest`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}
