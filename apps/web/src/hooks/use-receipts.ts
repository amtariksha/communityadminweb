'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Receipt, CreditNote } from '@communityos/shared';
import { invoiceKeys } from '@/hooks/use-invoices';
import { ledgerKeys } from '@/hooks/use-ledger';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

interface UnallocatedCredit {
  receipt_id: string;
  receipt_number: string;
  unit_id: string;
  unit_number: string;
  unallocated_amount: number;
  receipt_date: string;
}

interface CollectionSummaryRow {
  month: string;
  mode: string;
  count: number;
  total: number;
}

interface ReceiptSummary {
  total_collected: number;
  cash: number;
  cheque: number;
  bank_transfer: number;
  upi: number;
  online: number;
  count: number;
}

function aggregateSummary(rows: CollectionSummaryRow[]): ReceiptSummary {
  const summary: ReceiptSummary = {
    total_collected: 0,
    cash: 0,
    cheque: 0,
    bank_transfer: 0,
    upi: 0,
    online: 0,
    count: 0,
  };

  for (const row of rows) {
    const amount = Number(row.total) || 0;
    const count = Number(row.count) || 0;
    summary.total_collected += amount;
    summary.count += count;

    switch (row.mode) {
      case 'cash':
        summary.cash += amount;
        break;
      case 'cheque':
        summary.cheque += amount;
        break;
      case 'bank_transfer':
        summary.bank_transfer += amount;
        break;
      case 'upi':
        summary.upi += amount;
        break;
      case 'online':
        summary.online += amount;
        break;
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

interface ReceiptFilters {
  unit_id?: string;
  payment_mode?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateReceiptInput {
  financial_year_id: string;
  unit_id: string;
  receipt_date: string;
  amount: number;
  mode: string;
  reference_number?: string | null;
  bank_account_id?: string | null;
  narration?: string;
  allocations?: Array<{
    invoice_id: string;
    amount: number;
  }>;
}

interface BulkImportReceiptsInput {
  receipts: CreateReceiptInput[];
}

interface CreateCreditNoteInput {
  financial_year_id: string;
  invoice_id: string;
  unit_id: string;
  amount: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const receiptKeys = {
  all: ['receipts'] as const,
  lists: () => [...receiptKeys.all, 'list'] as const,
  list: (filters?: ReceiptFilters) => [...receiptKeys.lists(), filters] as const,
  details: () => [...receiptKeys.all, 'detail'] as const,
  detail: (id: string) => [...receiptKeys.details(), id] as const,
  unallocated: () => [...receiptKeys.all, 'unallocated'] as const,
  summary: () => [...receiptKeys.all, 'summary'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(filters?: ReceiptFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.unit_id) params.unit_id = filters.unit_id;
  if (filters.payment_mode) params.mode = filters.payment_mode;
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useReceipts(filters?: ReceiptFilters) {
  return useQuery({
    queryKey: receiptKeys.list(filters),
    queryFn: function fetchReceipts() {
      return api.get<PaginatedResponse<Receipt>>('/receipts', {
        params: filtersToParams(filters),
      });
    },
  });
}

export function useReceipt(id: string) {
  return useQuery({
    queryKey: receiptKeys.detail(id),
    queryFn: function fetchReceipt() {
      return api
        .get<{ data: Receipt }>(`/receipts/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

export function useUnallocatedCredits() {
  return useQuery({
    queryKey: receiptKeys.unallocated(),
    queryFn: function fetchUnallocatedCredits() {
      return api
        .get<{ data: UnallocatedCredit[] }>('/receipts/unallocated')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useReceiptSummary() {
  // Default to current financial year (Apr 1 to Mar 31)
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const startDate = `${fyStartYear}-04-01`;
  const endDate = `${fyStartYear + 1}-03-31`;

  return useQuery({
    queryKey: [...receiptKeys.summary(), startDate, endDate],
    queryFn: function fetchReceiptSummary() {
      return api
        .get<{ data: CollectionSummaryRow[] }>('/receipts/summary', {
          params: { start_date: startDate, end_date: endDate },
        })
        .then(function unwrapAndAggregate(res) {
          return aggregateSummary(res.data);
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createReceipt(input: CreateReceiptInput) {
      return api.post<{ data: Receipt }>('/receipts', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useBulkImportReceipts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function bulkImportReceipts(input: BulkImportReceiptsInput) {
      return api.post<{ message: string }>('/receipts/import', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createCreditNote(input: CreateCreditNoteInput) {
      return api.post<{ data: CreditNote }>('/receipts/credit-notes', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useRecalculateArrears() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function recalculateArrears(unitId: string) {
      return api.post<{ message: string }>(`/receipts/recalculate-arrears/${unitId}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Member Advances
// ---------------------------------------------------------------------------

export interface Advance {
  id: string;
  unit_id: string;
  unit_number: string;
  amount: number;
  remaining: number;
  receipt_id: string | null;
  receipt_number: string | null;
  description: string | null;
  created_at: string;
}

export function useAdvances(unitId?: string) {
  return useQuery({
    queryKey: [...receiptKeys.all, 'advances', unitId] as const,
    queryFn: function fetchAdvances() {
      const params: Record<string, string> = {};
      if (unitId) params.unit_id = unitId;
      return api.get<{ data: Advance[] }>('/receipts/advances', { params });
    },
  });
}

export function useApplyAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function applyAdvance(input: {
      advance_id: string;
      invoice_id: string;
      amount: number;
    }) {
      return api.post<{
        data: { applied: number; advance_remaining: number };
      }>('/receipts/advances/apply', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    },
  });
}
