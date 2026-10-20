'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { invoiceKeys } from '@/hooks/use-invoices';
import { ledgerKeys } from '@/hooks/use-ledger';
import { receiptKeys } from '@/hooks/use-receipts';
import { unitLedgerKeys } from '@/hooks/use-unit-ledger';

/**
 * Unidentified collections (INC-48): money received without a flat
 * reference, held in suspense until set against a unit. New routes: a 404
 * before the API is deployed is shown as "not available yet".
 */
export type UnidentifiedStatus = 'open' | 'identified' | 'voided';

export interface UnidentifiedCollection {
  id: string;
  receipt_number: string;
  receipt_date: string;
  /** NUMERIC on the wire. */
  amount: string;
  payment_mode: string;
  reference_number: string | null;
  bank_account_name: string | null;
  narration: string | null;
  status: UnidentifiedStatus;
  unit_id: string | null;
  unit_number: string | null;
  block: string | null;
  identified_at: string | null;
}

export interface UnidentifiedFilters {
  status: 'open' | 'identified' | 'all';
  from: string;
  to: string;
  search: string;
}

export interface RecordUnidentifiedInput {
  receipt_date: string;
  amount: number;
  mode: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'dd';
  bank_account_id?: string | null;
  reference_number?: string | null;
  payment_bank?: string | null;
  narration?: string | null;
}

export interface IdentifyInput {
  unit_id: string;
  payer_member_id?: string;
  allocation_mode: 'fifo' | 'selected';
  allocations?: Array<{ invoice_id: string; amount: number }>;
}

export const unidentifiedKeys = {
  all: ['unidentified-collections'] as const,
  list: (filters: UnidentifiedFilters) => [...unidentifiedKeys.all, filters] as const,
};

export function unidentifiedParams(filters: UnidentifiedFilters): Record<string, string> {
  const params: Record<string, string> = { status: filters.status };
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.search) params.search = filters.search;
  return params;
}

export function useUnidentifiedCollections(filters: UnidentifiedFilters) {
  return useQuery({
    queryKey: unidentifiedKeys.list(filters),
    queryFn: () => api.get<{ data: UnidentifiedCollection[]; total: number }>('/receipts/unidentified', { params: unidentifiedParams(filters) }),
    placeholderData: keepPreviousData,
    meta: { suppressToast: true },
    retry: false,
  });
}

function useInvalidateCollections(): () => void {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: unidentifiedKeys.all });
    queryClient.invalidateQueries({ queryKey: unitLedgerKeys.all });
    queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
    queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
  };
}

/** Record unidentified collection: DR bank / CR Unidentified Credits (suspense). */
export function useRecordUnidentified() {
  const invalidate = useInvalidateCollections();
  return useMutation({
    mutationFn: (input: RecordUnidentifiedInput) => api.post<{ data: UnidentifiedCollection }>('/receipts/unidentified', input),
    onSuccess: invalidate,
  });
}

/** Identify: DR suspense / CR the unit's bills (FiFo or chosen), the rest its advance. */
export function useIdentifyCollection() {
  const invalidate = useInvalidateCollections();
  return useMutation({
    mutationFn: ({ id, ...body }: IdentifyInput & { id: string }) => api.post<{ data: UnidentifiedCollection }>(`/receipts/${id}/identify`, body),
    onSuccess: invalidate,
  });
}
