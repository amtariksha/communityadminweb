'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { invoiceKeys } from '@/hooks/use-invoices';
import { ledgerKeys } from '@/hooks/use-ledger';
import { receiptKeys } from '@/hooks/use-receipts';
import { unitLedgerKeys } from '@/hooks/use-unit-ledger';

/**
 * Refundable deposits per unit (INC-47): taken on a receipt, held for the
 * unit, refunded or set against its dues. Read is FINANCE_READ, writes
 * FINANCE_WRITE. New routes: a 404 before the API is deployed is shown as
 * "not available yet" (no toast, no retry).
 */
export type DepositStatus = 'held' | 'partly_refunded' | 'refunded' | 'adjusted' | 'voided';

export interface RefundableDeposit {
  id: string;
  unit_id: string | null;
  unit_number: string | null;
  block: string | null;
  receipt_id: string;
  receipt_number: string;
  receipt_date: string;
  /** NUMERIC amounts arrive as strings. */
  amount: string;
  refunded_amount: string;
  adjusted_amount: string;
  held: string;
  status: DepositStatus;
  description: string | null;
}

export type DepositMode = 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'dd';

export interface TakeDepositInput {
  unit_id: string;
  payer_member_id?: string;
  amount: number;
  receipt_date: string;
  mode: DepositMode;
  reference_number?: string | null;
  payment_bank?: string | null;
  instrument_date?: string | null;
  bank_account_id?: string | null;
  description?: string | null;
}

export interface RefundDepositInput {
  amount: number;
  date: string;
  mode: DepositMode;
  bank_account_id?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface AdjustDepositInput {
  amount: number;
  date: string;
  notes?: string | null;
}

export const depositKeys = {
  all: ['refundable-deposits'] as const,
  unit: (unitId: string) => [...depositKeys.all, unitId] as const,
};

export function useRefundableDeposits(unitId: string) {
  return useQuery({
    queryKey: depositKeys.unit(unitId),
    queryFn: () => api.get<{ data: RefundableDeposit[] }>('/refundable-deposits', { params: { unit_id: unitId } }).then((res) => res.data),
    enabled: unitId !== '',
    meta: { suppressToast: true },
    retry: false,
  });
}

function useInvalidateDeposits(): () => void {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: depositKeys.all });
    queryClient.invalidateQueries({ queryKey: unitLedgerKeys.all });
    queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
    queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
  };
}

/** Post a Refundable Deposit: DR bank / CR Refundable Deposits. */
export function useTakeDeposit() {
  const invalidate = useInvalidateDeposits();
  return useMutation({
    mutationFn: (input: TakeDepositInput) => api.post<{ data: RefundableDeposit }>('/refundable-deposits', input),
    onSuccess: invalidate,
  });
}

/** Refund: DR Refundable Deposits / CR bank. */
export function useRefundDeposit() {
  const invalidate = useInvalidateDeposits();
  return useMutation({
    mutationFn: ({ id, ...body }: RefundDepositInput & { id: string }) =>
      api.post<{ data: RefundableDeposit }>(`/refundable-deposits/${id}/refund`, body),
    onSuccess: invalidate,
  });
}

/** Set against dues: DR Refundable Deposits / CR receivable, oldest bills first. */
export function useAdjustDeposit() {
  const invalidate = useInvalidateDeposits();
  return useMutation({
    mutationFn: ({ id, ...body }: AdjustDepositInput & { id: string }) =>
      api.post<{ data: RefundableDeposit }>(`/refundable-deposits/${id}/adjust`, body),
    onSuccess: invalidate,
  });
}
