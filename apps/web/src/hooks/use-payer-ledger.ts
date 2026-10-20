'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { customerKeys } from '@/hooks/use-customers';
import { invoiceKeys } from '@/hooks/use-invoices';
import { ledgerKeys } from '@/hooks/use-ledger';
import { receiptKeys, type CreateReceiptInput } from '@/hooks/use-receipts';
import { unitLedgerKeys } from '@/hooks/use-unit-ledger';
import { statementParams, type OpenBill, type StatementFilters, type UnitStatement } from '@/hooks/use-unit-statement';

/**
 * Non Member Income (INC-45, INC-46): a payer's open bills and statement,
 * and the By Date list. New routes:
 * before the API is deployed they answer 404, which the screens show as
 * "not available yet" (no toast, no retry).
 */
const quiet = { meta: { suppressToast: true }, retry: false } as const;

export const payerLedgerKeys = {
  all: [...unitLedgerKeys.all, 'payer'] as const,
  openBills: (customerId: string) => [...payerLedgerKeys.all, 'open-bills', customerId] as const,
  statement: (customerId: string, filters: StatementFilters) => [...payerLedgerKeys.all, 'statement', customerId, filters] as const,
  byDate: (from: string, to: string) => [...payerLedgerKeys.all, 'by-date', from, to] as const,
};

/** One row of Non Member Income › By Date (INC-S31). */
export interface NonMemberEntry {
  type: 'invoice' | 'receipt' | 'credit_note' | 'direct_income';
  id: string;
  date: string;
  number: string;
  payer: string | null;
  account: string | null;
  /** NUMERIC on the wire. */
  amount: string;
}

/** INC-46 — a payer's statement, the unit statement's shape (scope always all). */
export function usePayerStatement(customerId: string, filters: StatementFilters) {
  return useQuery({
    queryKey: payerLedgerKeys.statement(customerId, filters),
    queryFn: () =>
      api
        .get<{ data: UnitStatement }>(`/unit-ledger/customers/${customerId}/statement`, { params: statementParams(filters) })
        .then((res) => res.data),
    placeholderData: keepPreviousData,
    enabled: customerId !== '',
    ...quiet,
  });
}

/** INC-46 — everything posted for non-member income in a period, once Fetch is pressed. */
export function useNonMemberByDate(range: { from: string; to: string } | null) {
  return useQuery({
    queryKey: payerLedgerKeys.byDate(range?.from ?? '', range?.to ?? ''),
    queryFn: () =>
      api.get<{ data: NonMemberEntry[]; total: number }>('/unit-ledger/non-member/by-date', { params: { from: range?.from ?? '', to: range?.to ?? '' } }),
    enabled: range !== null,
    ...quiet,
  });
}

/** INC-45 — the payer's posted invoices still owing, oldest due first. */
export function usePayerOpenBills(customerId: string) {
  return useQuery({
    queryKey: payerLedgerKeys.openBills(customerId),
    queryFn: () => api.get<{ data: OpenBill[] }>(`/unit-ledger/customers/${customerId}/open-bills`).then((res) => res.data),
    enabled: customerId !== '',
    ...quiet,
  });
}

/** What POST /receipts answers for a payer's collection. */
export interface PayerReceipt {
  id: string;
  receipt_number: string;
  customer_id: string;
  amount: string;
}

/** Everything a payer's money moves: its dues, the payer list, the registers and the books. */
export function useInvalidatePayerMoney(): () => void {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: unitLedgerKeys.all });
    queryClient.invalidateQueries({ queryKey: customerKeys.all });
    queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
    queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
  };
}

/** INC-45 — Post Collection for a payer (POST /receipts with customer_id). */
export function usePostPayerCollection() {
  const invalidate = useInvalidatePayerMoney();
  return useMutation({
    mutationFn: (input: CreateReceiptInput) => api.post<{ data: PayerReceipt }>('/receipts', input),
    onSuccess: invalidate,
  });
}
