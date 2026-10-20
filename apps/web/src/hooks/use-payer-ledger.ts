'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { customerKeys } from '@/hooks/use-customers';
import { invoiceKeys } from '@/hooks/use-invoices';
import { ledgerKeys } from '@/hooks/use-ledger';
import { receiptKeys, type CreateReceiptInput } from '@/hooks/use-receipts';
import { unitLedgerKeys } from '@/hooks/use-unit-ledger';
import type { OpenBill } from '@/hooks/use-unit-statement';

/**
 * Non Member Income (INC-45, INC-46): a payer's open bills. New routes:
 * before the API is deployed they answer 404, which the screens show as
 * "not available yet" (no toast, no retry).
 */
const quiet = { meta: { suppressToast: true }, retry: false } as const;

export const payerLedgerKeys = {
  all: [...unitLedgerKeys.all, 'payer'] as const,
  openBills: (customerId: string) => [...payerLedgerKeys.all, 'open-bills', customerId] as const,
};

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
