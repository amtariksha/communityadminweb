'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { utilityKeys } from './use-utilities';

/** POST /utilities/bills/invoice-batch (UTIL-07). */
export interface InvoiceBatchRequest {
  bill_ids?: string[];
  filter?: { meter_type: 'water' | 'electricity' | 'gas'; period_from: string; period_to: string; block?: string };
  /** Unset = each bill's meter rule account. */
  ledger_account_id?: string;
  invoice_date: string;
  /** Unset = Utility Setup's default. */
  post_now?: boolean;
}

export interface InvoiceBatchResult {
  invoices_created: number;
  bills_invoiced: number;
  posted: boolean;
  invoices: Array<{
    id: string;
    invoice_number: string;
    unit_id: string;
    unit_number: string;
    net_amount: string;
    due_date: string;
    status: string;
    bill_ids: string[];
  }>;
  skipped: Array<{ bill_id: string; reason: string }>;
}

export function useInvoiceBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function invoiceBatch(request: InvoiceBatchRequest) {
      return api.post<{ data: InvoiceBatchResult }>('/utilities/bills/invoice-batch', request).then((res) => res.data);
    },
    onSuccess: function refresh() {
      queryClient.invalidateQueries({ queryKey: utilityKeys.bills() });
      queryClient.invalidateQueries({ queryKey: utilityKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['unit-ledger'] });
    },
  });
}

/** One line for the toast after a batch. */
export function batchSummary(result: InvoiceBatchResult): string {
  const invoices = `${result.invoices_created} invoice${result.invoices_created === 1 ? '' : 's'}`;
  const bills = `${result.bills_invoiced} bill${result.bills_invoiced === 1 ? '' : 's'}`;
  const state = result.posted ? 'posted' : 'saved as drafts';
  const skipped = result.skipped.length > 0 ? `; ${result.skipped.length} skipped` : '';
  return `${invoices} for ${bills}, ${state}${skipped}.`;
}
