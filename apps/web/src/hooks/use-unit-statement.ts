'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { invoiceKeys } from '@/hooks/use-invoices';
import { ledgerKeys } from '@/hooks/use-ledger';
import { receiptKeys } from '@/hooks/use-receipts';
import { unitLedgerKeys, type UnitLedgerScope } from '@/hooks/use-unit-ledger';

export type StatementDocType = 'invoice' | 'debit_note' | 'interest' | 'receipt' | 'receipt_void' | 'credit_note';
export type StatementAction = 'reverse' | 'edit' | 'view_allocation';
export type StatementView = 'admin' | 'resident';

export interface StatementRow {
  doc_type: StatementDocType;
  doc_id: string;
  date: string;
  posted_by?: string;
  invoice_id: string | null;
  invoice_no: string | null;
  receipt_no: string | null;
  account: string | null;
  description: string;
  due: number;
  paid: number;
  balance: number;
  reversal: boolean;
  actions: StatementAction[];
}

export interface UnitStatement {
  unit: { id: string; unit_number: string; block: string | null };
  from: string;
  to: string;
  scope: UnitLedgerScope;
  view: StatementView;
  show_reversals: boolean;
  summary: { current_due: number; current_advances: number; refundable_deposit: number };
  opening: number;
  rows: StatementRow[];
  totals: { due: number; paid: number; net: number };
  /** INC-46 — set on a non-member payer's statement (`unit` then carries the payer's name). */
  payer?: { id: string; name: string };
}

/** Whose statement a screen shows: a unit's (INC-22) or a non-member payer's (INC-46). */
export type StatementParty = { kind: 'unit'; id: string } | { kind: 'payer'; id: string };

/** GET path of a party's statement (json, or a file with `format`). */
export function statementPath(party: StatementParty): string {
  return party.kind === 'unit' ? `/unit-ledger/units/${party.id}/statement` : `/unit-ledger/customers/${party.id}/statement`;
}

export interface StatementFilters {
  /** Empty = the server's default (current financial year start / today). */
  from: string;
  to: string;
  showReversals: boolean;
  scope: UnitLedgerScope;
  view: StatementView;
}

export interface OpenBill {
  id: string;
  invoice_number: string;
  bill_date: string;
  due_date: string;
  account: string | null;
  details: string;
  bill_amount: string;
  remaining: string;
  income_scope: string;
}

export interface AllocationLink {
  kind: 'receipt' | 'credit_note';
  invoice_id: string;
  invoice_number: string;
  source_id: string;
  source_number: string;
  amount: string;
  date: string;
  reversed_at: string | null;
  reversal_reason: string | null;
}

export interface AllocationView {
  doc_type: 'invoice' | 'receipt' | 'credit_note';
  doc_id: string;
  links: AllocationLink[];
  advance_remaining?: string;
}

export interface ReallocationResult {
  changed: boolean;
  allocations_reversed: number;
  allocations_created: number;
  bills_changed: Array<{ id: string; invoice_number: string; balance_due: number; status: string }>;
  advance_before: number;
  advance_after: number;
  journal_entry_id: string | null;
}

export const statementKeys = {
  all: [...unitLedgerKeys.all, 'statement'] as const,
  statement: (unitId: string, filters: StatementFilters) => [...statementKeys.all, unitId, filters] as const,
  openBills: (unitId: string, scope: UnitLedgerScope) => [...unitLedgerKeys.all, 'open-bills', unitId, scope] as const,
  allocations: (docType: string, docId: string) => [...unitLedgerKeys.all, 'allocations', docType, docId] as const,
};

/** Query parameters of GET /unit-ledger/units/:unitId/statement. */
export function statementParams(filters: StatementFilters, format?: 'csv' | 'xlsx' | 'pdf'): Record<string, string> {
  const params: Record<string, string> = {
    scope: filters.scope,
    view: filters.view,
    show_reversals: String(filters.showReversals),
  };
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (format) params.format = format;
  return params;
}

const quiet = { meta: { suppressToast: true }, retry: false } as const;

/** INC-21 — the unit's account statement. */
export function useUnitStatement(unitId: string, filters: StatementFilters) {
  return useQuery({
    queryKey: statementKeys.statement(unitId, filters),
    queryFn: () =>
      api
        .get<{ data: UnitStatement }>(`/unit-ledger/units/${unitId}/statement`, { params: statementParams(filters) })
        .then((res) => res.data),
    placeholderData: keepPreviousData,
    ...quiet,
  });
}

/** INC-21 — the unit's open bills, oldest due first. */
export function useOpenBills(unitId: string, scope: UnitLedgerScope, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: statementKeys.openBills(unitId, scope),
    queryFn: () =>
      api.get<{ data: OpenBill[] }>(`/unit-ledger/units/${unitId}/open-bills`, { params: { scope } }).then((res) => res.data),
    enabled: options.enabled ?? true,
    ...quiet,
  });
}

/** INC-21 — View Allocation. */
export function useAllocations(docType: AllocationView['doc_type'], docId: string, enabled: boolean) {
  return useQuery({
    queryKey: statementKeys.allocations(docType, docId),
    queryFn: () =>
      api
        .get<{ data: AllocationView }>('/unit-ledger/allocations', { params: { doc_type: docType, doc_id: docId } })
        .then((res) => res.data),
    enabled,
    ...quiet,
  });
}

function useInvalidateUnitMoney(): () => void {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: unitLedgerKeys.all });
    queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
    queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
  };
}

/** INC-28 — Auto Allocate on FiFo Basis. */
export function useReallocateFifo() {
  const invalidate = useInvalidateUnitMoney();
  return useMutation({
    mutationFn: (input: { unitId: string; scope: UnitLedgerScope }) =>
      api.post<{ data: ReallocationResult }>(`/unit-ledger/units/${input.unitId}/reallocate-fifo`, { scope: input.scope }),
    onSuccess: invalidate,
  });
}

/** INC-22 — Edit on an invoice row: due date and comment only. */
export function useEditInvoiceDetails() {
  const invalidate = useInvalidateUnitMoney();
  return useMutation({
    mutationFn: (input: { id: string; due_date?: string; comment?: string | null }) => {
      const { id, ...body } = input;
      return api.patch<{ data: unknown }>(`/invoices/${id}/details`, body);
    },
    onSuccess: invalidate,
  });
}

/** INC-22 — Edit on a receipt row: payment number, bank and notes only. */
export function useEditReceiptDetails() {
  const invalidate = useInvalidateUnitMoney();
  return useMutation({
    mutationFn: (input: { id: string; reference_number?: string | null; payment_bank?: string | null; notes?: string | null }) => {
      const { id, ...body } = input;
      return api.patch<{ data: unknown }>(`/receipts/${id}/details`, body);
    },
    onSuccess: invalidate,
  });
}
