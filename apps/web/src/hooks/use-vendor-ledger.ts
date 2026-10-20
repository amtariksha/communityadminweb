'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { ledgerKeys } from '@/hooks/use-ledger';
import { purchaseKeys } from '@/hooks/use-purchases';
import { vendorPaymentKeys, type OpenBill, type OpenCredit } from '@/hooks/use-vendor-payments';

/**
 * Vendor statement (EXP-15), By Vendors with Auto Allocation (EXP-16), the
 * payment register with Reverse (EXP-17) and numbering (EXP-18). Every read
 * answers `null` from an API older than these routes (404), so a screen can
 * say "not available yet" instead of failing.
 */

async function nullOn404<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export interface StatementRow {
  line_id: string;
  entry_id: string;
  entry_date: string;
  voucher_number: string | null;
  posted_by_name: string | null;
  invoice_date: string | null;
  vendor_invoice_number: string | null;
  expense_heads: string | null;
  comments: string | null;
  due: string;
  payment: string;
  kind: 'invoice' | 'payment' | 'debit_note' | 'other';
  source_id: string | null;
  is_reversal: boolean;
  is_reversed: boolean;
  can_reverse: boolean;
  can_edit: boolean;
}

export interface VendorStatement {
  vendor: { id: string; name: string };
  from: string;
  to: string;
  opening_balance: string;
  rows: StatementRow[];
  totals: { due: string; payment: string };
  net: string;
  current_dues: { amount: string; rows: Array<OpenBill & { days_overdue: number }> };
  current_advance: { amount: string; rows: OpenCredit[] };
}

export interface StatementFilters {
  from?: string;
  to?: string;
  showReversals?: boolean;
}

export interface PayableRow {
  vendor_id: string;
  vendor_code: string | null;
  name: string;
  is_active: boolean;
  balance: string;
}

export interface PayablesFilters {
  search?: string;
  searchIn?: 'vendor_id' | 'vendor_name' | 'any';
  page: number;
  limit: number;
}

export interface RegisterRow {
  id: string;
  voucher_number: string | null;
  payment_date: string;
  posted_by_name: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  invoices: string | null;
  amount: string;
  write_off_amount: string | null;
  account_name: string | null;
  reference_number: string | null;
  instrument_date: string | null;
  bank_ledger: string | null;
  notes: string | null;
  /** The Comment written beside each invoice paid, "INV-1: text; …" (EXP-S9; absent from an older API). */
  invoice_comments?: string | null;
  is_reversed: boolean;
  is_reversal: boolean;
  reversal_of: string | null;
  kind: string | null;
}

export interface RegisterFilters {
  from?: string;
  to?: string;
  search?: string;
  suppressReversals?: boolean;
  page: number;
  limit: number;
}

export interface NumberingRow {
  key: 'next_voucher_number' | 'next_debit_note_number' | 'next_purchase_request_number' | 'next_bill_number';
  label: string;
  prefix: string;
  last_issued: number;
  next: number;
}

export const vendorLedgerKeys = {
  all: ['vendor-ledger'] as const,
  statement: (vendorId: string, filters: StatementFilters) => [...vendorLedgerKeys.all, 'statement', vendorId, filters] as const,
  payables: (filters: PayablesFilters) => [...vendorLedgerKeys.all, 'payables', filters] as const,
  register: (filters: RegisterFilters) => [...vendorLedgerKeys.all, 'register', filters] as const,
  numbering: () => [...vendorLedgerKeys.all, 'numbering'] as const,
};

export function statementParams(filters: StatementFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.showReversals) params.show_reversals = 'true';
  return params;
}

export function registerParams(filters: Omit<RegisterFilters, 'page' | 'limit'>): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.search) params.search = filters.search;
  if (filters.suppressReversals) params.suppress_reversals = 'true';
  return params;
}

export function useVendorStatement(vendorId: string, filters: StatementFilters, enabled = true) {
  return useQuery({
    queryKey: vendorLedgerKeys.statement(vendorId, filters),
    enabled: enabled && vendorId !== '',
    meta: { suppressToast: true },
    queryFn: () =>
      nullOn404(() => api.get<{ data: VendorStatement }>(`/purchases/vendors/${vendorId}/statement`, { params: statementParams(filters) }).then((res) => res.data)),
  });
}

export function useVendorPayables(filters: PayablesFilters) {
  return useQuery({
    queryKey: vendorLedgerKeys.payables(filters),
    meta: { suppressToast: true },
    queryFn: () => {
      const params: Record<string, string> = { page: String(filters.page), limit: String(filters.limit) };
      if (filters.search) params.search = filters.search;
      if (filters.searchIn) params.search_in = filters.searchIn;
      return nullOn404(() => api.get<{ data: PayableRow[]; total: number; total_payables: string }>('/purchases/vendors/payables', { params }));
    },
  });
}

export function usePaymentRegister(filters: RegisterFilters, enabled = true) {
  return useQuery({
    queryKey: vendorLedgerKeys.register(filters),
    enabled,
    meta: { suppressToast: true },
    queryFn: () =>
      api.get<{ data: RegisterRow[]; total: number }>('/purchases/payments', {
        params: { ...registerParams(filters), page: String(filters.page), limit: String(filters.limit) },
      }),
  });
}

export function useNumbering() {
  return useQuery({
    queryKey: vendorLedgerKeys.numbering(),
    meta: { suppressToast: true },
    queryFn: () => nullOn404(() => api.get<{ data: NumberingRow[] }>('/purchases/numbering').then((res) => res.data)),
  });
}

function useLedgerMutation<Input, Output>(send: (input: Input) => Promise<Output>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: vendorLedgerKeys.all });
      queryClient.invalidateQueries({ queryKey: vendorPaymentKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
    },
  });
}

/** Reverse a payment or debit note (EXP-17), or cancel an invoice nothing is set against (existing cancel). */
export function useReverseVendorRecord() {
  return useLedgerMutation((input: { kind: 'payment' | 'debit_note' | 'bill'; id: string; reason: string; reversal_date?: string }) =>
    input.kind === 'bill'
      ? api.post(`/purchases/bills/${input.id}/cancel`, { reason: input.reason })
      : api.post(`/purchases/${input.kind === 'payment' ? 'payments' : 'debit-notes'}/${input.id}/reverse`, {
          reason: input.reason,
          reversal_date: input.reversal_date,
        }),
  );
}

export function useAutoAllocate() {
  return useLedgerMutation((input: { vendor_id?: string }) =>
    api.post<{ data: Array<{ vendor_id: string; allocations: number; bills_settled: number }> }>('/purchases/vendors/auto-allocate', input).then((res) => res.data),
  );
}

export function useSetNumbering() {
  return useLedgerMutation((input: Partial<Record<NumberingRow['key'], number>>) =>
    api.put<{ data: NumberingRow[] }>('/purchases/numbering', input).then((res) => res.data),
  );
}
