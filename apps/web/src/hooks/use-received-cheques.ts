'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { invoiceKeys } from '@/hooks/use-invoices';
import { receiptKeys } from '@/hooks/use-receipts';
import { unitLedgerKeys } from '@/hooks/use-unit-ledger';

/**
 * Received post-dated cheques (INC-64): GET/POST /received-cheques and
 * :id/deposit · bounce · cancel. New routes: a 404 before the API is
 * deployed is shown as "not available yet".
 */
export type ChequeStatus = 'pending' | 'deposited' | 'bounced' | 'cancelled';

export interface ReceivedCheque {
  id: string;
  unit_id: string;
  unit_number: string;
  block: string | null;
  cheque_number: string;
  bank: string;
  cheque_date: string;
  amount: number;
  received_on: string;
  notes: string | null;
  status: ChequeStatus;
  receipt_id: string | null;
  receipt_number: string | null;
  deposited_on: string | null;
  bounced_on: string | null;
  bounce_reason: string | null;
  bounce_charge_invoice_id: string | null;
  cancelled_on: string | null;
  cancel_reason: string | null;
  charge_error?: { code: string; message: string };
}

export interface ChequeFilters {
  /** '' = every status; 'due' = pending cheques whose date has come. */
  status: ChequeStatus | 'due' | '';
  search: string;
  page: number;
  limit: number;
}

export interface ChequeList {
  data: ReceivedCheque[];
  total: number;
  counts: Record<ChequeStatus | 'due', number>;
}

export interface RegisterChequeInput {
  unit_id: string;
  cheque_number: string;
  bank: string;
  cheque_date: string;
  amount: number;
  notes?: string;
}

export interface BounceInput {
  reason: string;
  bounce_date?: string;
  charge?: { amount: number; ledger_account_id: string };
}

export const chequeKeys = {
  all: ['received-cheques'] as const,
  list: (filters: ChequeFilters) => [...chequeKeys.all, filters] as const,
};

export function chequeParams(filters: ChequeFilters): Record<string, string> {
  const params: Record<string, string> = { page: String(filters.page), limit: String(filters.limit) };
  if (filters.status === 'due') params.due = 'true';
  else if (filters.status) params.status = filters.status;
  if (filters.search.trim()) params.q = filters.search.trim();
  return params;
}

export function useReceivedCheques(filters: ChequeFilters) {
  return useQuery({
    queryKey: chequeKeys.list(filters),
    queryFn: () => api.get<ChequeList>('/received-cheques', { params: chequeParams(filters) }),
    placeholderData: keepPreviousData,
    meta: { suppressToast: true },
    retry: false,
  });
}

function useChequeMutation<Input>(fn: (input: Input) => Promise<{ data: ReceivedCheque }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of [chequeKeys.all, receiptKeys.all, invoiceKeys.all, unitLedgerKeys.all]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useRegisterCheque() {
  return useChequeMutation((input: RegisterChequeInput) => api.post<{ data: ReceivedCheque }>('/received-cheques', input));
}

export function useDepositCheque() {
  return useChequeMutation(({ id, ...body }: { id: string; deposit_date?: string; bank_account_id?: string | null }) =>
    api.post<{ data: ReceivedCheque }>(`/received-cheques/${id}/deposit`, body),
  );
}

export function useBounceCheque() {
  return useChequeMutation(({ id, ...body }: BounceInput & { id: string }) => api.post<{ data: ReceivedCheque }>(`/received-cheques/${id}/bounce`, body));
}

export function useCancelCheque() {
  return useChequeMutation(({ id, reason }: { id: string; reason: string }) => api.post<{ data: ReceivedCheque }>(`/received-cheques/${id}/cancel`, { reason }));
}
