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

interface Defaulter {
  unit_id: string;
  unit_number: string;
  block: string | null;
  total_overdue: number;
  overdue_months: number;
  oldest_due_date: string;
}

interface LpiCalculation {
  unit_id: string;
  unit_number: string;
  invoice_id: string;
  invoice_number: string;
  principal: number;
  days_overdue: number;
  lpi_amount: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

interface InvoiceFilters {
  status?: string;
  unit_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateInvoiceRuleInput {
  name: string;
  ledger_account_id: string;
  frequency: string;
  amount: number;
  is_gst_applicable?: boolean;
  gst_rate?: number;
}

interface UpdateInvoiceRuleInput extends Partial<CreateInvoiceRuleInput> {
  is_active?: boolean;
}

interface GenerateInvoicesInput {
  rule_id: string;
  date: string;
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
  lpi: () => [...invoiceKeys.all, 'lpi'] as const,
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
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
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

export function useCalculateLPI() {
  return useQuery({
    queryKey: invoiceKeys.lpi(),
    queryFn: function fetchLpi() {
      return api
        .get<{ data: LpiCalculation[] }>('/invoices/lpi')
        .then(function unwrap(res) {
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
      return api.post<{ data: Invoice[]; message: string }>('/invoices/generate', input);
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
    mutationFn: function cancelInvoice(id: string) {
      return api.post<{ message: string }>(`/invoices/${id}/cancel`);
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
