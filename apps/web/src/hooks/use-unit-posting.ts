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
}

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
}

export interface MultiLineInvoiceInput {
  unit_id: string;
  invoice_date: string;
  due_date: string;
  with_gst: boolean;
  apply_same_gst?: number | null;
  lines: Array<{ ledger_account_id: string; quantity: number; amount: number; gst_rate?: number; comment?: string | null }>;
}

const quiet = { meta: { suppressToast: true }, retry: false } as const;

export const postingKeys = {
  options: (date: string) => [...unitLedgerKeys.all, 'posting-options', date] as const,
  unitRow: (unitId: string) => [...unitLedgerKeys.all, 'unit-row', unitId] as const,
};

export function usePostingOptions(date: string) {
  return useQuery({
    queryKey: postingKeys.options(date),
    queryFn: () =>
      api.get<{ data: PostingOptions }>('/unit-ledger/posting-options', { params: date ? { date } : {} }).then((res) => res.data),
    ...quiet,
  });
}

/** One unit's Member Income row: the header of its posting forms. */
export function useUnitDuesRow(unitId: string) {
  return useQuery({
    queryKey: postingKeys.unitRow(unitId),
    queryFn: () =>
      api
        .get<UnitDuesResult>('/unit-ledger/units', { params: { unit_id: unitId, limit: '1' } })
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
