'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { invoiceKeys } from '@/hooks/use-invoices';
import { ledgerKeys } from '@/hooks/use-ledger';
import { receiptKeys } from '@/hooks/use-receipts';
import { unitLedgerKeys, type UnitDuesResult, type UnitDuesRow } from '@/hooks/use-unit-ledger';

/** What the Post Invoice forms offer (GET /unit-ledger/posting-options). */
export interface PostingOptions {
  show_gst_on_adhoc: boolean;
  gst_rates: number[];
  due_days: number;
  date: string;
  /** The ledger the options are for; absent on an API older than UTIL-08. */
  scope?: PostingScope;
}

/** Member dues, or utility dues posted from Utility Income (UTIL-08). */
export type PostingScope = 'member' | 'utility';

export interface PostedUnitInvoice {
  id: string;
  invoice_number: string;
  document_type: 'invoice' | 'debit_note';
  unit_id: string;
  invoice_date: string;
  due_date: string;
  subtotal: string;
  gst_amount: string;
  net_amount: string;
  status: string;
}

export interface AdhocInvoiceInput {
  unit_id: string;
  amount: number;
  ledger_account_id: string;
  comment?: string | null;
  invoice_date: string;
  due_date?: string;
  period_from?: string;
  period_to?: string;
  period_not_applicable: boolean;
  apply_gst: boolean;
  gst_rate?: number;
  as_debit_note: boolean;
  /** UTIL-08 — sent only for utility dues. */
  scope?: PostingScope;
}

export interface MultiLineInvoiceInput {
  unit_id: string;
  invoice_date: string;
  due_date: string;
  with_gst: boolean;
  apply_same_gst?: number | null;
  lines: Array<{ ledger_account_id: string; quantity: number; amount: number; gst_rate?: number; comment?: string | null }>;
}

/** INC-25 — a credit note from the unit (POST /receipts/credit-notes with a kind). */
export type UnitCreditNoteInput = {
  unit_id: string;
  reason: string;
  credit_note_date?: string;
  payer_member_id?: string;
} & (
  | { kind: 'specific'; bills: Array<{ invoice_id: string; amount: number }> }
  | { kind: 'general'; amount: number }
  | { kind: 'account_specific'; ledger_account_id: string; amount: number }
);

export interface PostedUnitCreditNote {
  id: string;
  credit_note_number: string;
  kind: string;
  amount: string;
  credit_note_date: string;
  allocations: Array<{ invoice_id: string; amount: number }>;
  advance: number;
}

const quiet = { meta: { suppressToast: true }, retry: false } as const;

export const postingKeys = {
  options: (date: string, scope: PostingScope = 'member') => [...unitLedgerKeys.all, 'posting-options', date, scope] as const,
  unitRow: (unitId: string, scope: PostingScope = 'member') => [...unitLedgerKeys.all, 'unit-row', unitId, scope] as const,
};

function scopeParam(scope: PostingScope): Record<string, string> {
  return scope === 'utility' ? { scope } : {};
}

export function usePostingOptions(date: string, scope: PostingScope = 'member') {
  return useQuery({
    queryKey: postingKeys.options(date, scope),
    queryFn: () =>
      api
        .get<{ data: PostingOptions }>('/unit-ledger/posting-options', { params: { ...(date ? { date } : {}), ...scopeParam(scope) } })
        .then((res) => res.data),
    ...quiet,
  });
}

/** One unit's Member Income (or Utility Income) row: the header of its posting forms. */
export function useUnitDuesRow(unitId: string, scope: PostingScope = 'member') {
  return useQuery({
    queryKey: postingKeys.unitRow(unitId, scope),
    queryFn: () =>
      api
        .get<UnitDuesResult>('/unit-ledger/units', { params: { unit_id: unitId, limit: '1', ...scopeParam(scope) } })
        .then((res): UnitDuesRow | null => res.data[0] ?? null),
    enabled: unitId !== '',
    ...quiet,
  });
}

function useInvalidatePosting(): () => void {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: unitLedgerKeys.all });
    queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
    queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
  };
}

/** INC-23 — Post Invoice for a unit (posted at once). */
export function usePostAdhocInvoice() {
  const invalidate = useInvalidatePosting();
  return useMutation({
    mutationFn: (input: AdhocInvoiceInput) => api.post<{ data: PostedUnitInvoice }>('/invoices/adhoc', input),
    onSuccess: invalidate,
  });
}

/** INC-24 — Post Multi-Line (GST) Invoice for a unit. */
export function usePostMultiLineInvoice() {
  const invalidate = useInvalidatePosting();
  return useMutation({
    mutationFn: (input: MultiLineInvoiceInput) => api.post<{ data: PostedUnitInvoice }>('/invoices/adhoc/multi-line', input),
    onSuccess: invalidate,
  });
}

/** INC-25 — post a general, account-specific or specific credit note for a unit. */
export function usePostUnitCreditNote() {
  const invalidate = useInvalidatePosting();
  return useMutation({
    mutationFn: (input: UnitCreditNoteInput) => api.post<{ data: PostedUnitCreditNote }>('/receipts/credit-notes', input),
    onSuccess: invalidate,
  });
}
