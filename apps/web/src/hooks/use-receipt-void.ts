'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { invoiceKeys } from '@/hooks/use-invoices';
import { ledgerKeys } from '@/hooks/use-ledger';
import { receiptKeys } from '@/hooks/use-receipts';

export interface VoidedReceipt {
  id: string;
  receipt_number: string;
  voided_at: string;
  void_reason: string;
  void_journal_entry_id: string;
  invoices_reopened: Array<{
    id: string;
    invoice_number: string;
    amount_restored: number;
    balance_due: number;
    status: string;
  }>;
}

/**
 * INC-27 — void a receipt: the API posts the reversal, reverses its
 * allocations and reopens the bills it paid. Every list that shows money
 * for the unit is refreshed.
 */
export function useVoidReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function voidReceipt(input: { receiptId: string; reason: string }) {
      return api.post<{ data: VoidedReceipt }>(`/receipts/${input.receiptId}/void`, {
        reason: input.reason,
      });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['unit-ledger'] });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}
