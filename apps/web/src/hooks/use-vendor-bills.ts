'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ledgerKeys } from '@/hooks/use-ledger';
import { purchaseKeys } from '@/hooks/use-purchases';
import { vendorKeys } from '@/hooks/use-vendors';

/**
 * Vendor invoices with lines, GST per line and TDS by section (EXP-11 API,
 * EXP-12 page). POST /purchases/bills with `lines`, POST /purchases/bills/
 * preview (nothing written), GET /purchases/expense-heads/summary for the
 * head picker and the society's GST rates.
 */

export type GstType = 'cgst_sgst' | 'igst' | 'none';
export type TdsBasis = 'percent_excl_gst' | 'amount';

export interface VendorInvoiceLineInput {
  ledger_account_id: string;
  description?: string | null;
  hsn_sac?: string | null;
  taxable_amount: number;
  gst_type: GstType;
  gst_rate: number;
}

export interface VendorInvoiceInput {
  vendor_id: string;
  vendor_invoice_number: string;
  bill_date: string;
  due_date: string;
  lines: VendorInvoiceLineInput[];
  tds?: { basis: TdsBasis; value: number; section: string | null } | null;
  payee_name?: string | null;
  narration?: string;
}

export interface BillPreview {
  lines: Array<{ line_no: number; ledger_account_id: string; taxable_amount: number; gst_type: GstType; gst_rate: number; cgst: number; sgst: number; igst: number; line_total: number }>;
  entries: Array<{ ledger_account_id: string; account_code: string | null; account_name: string; debit: number; credit: number }>;
  totals: { taxable: number; cgst: number; sgst: number; igst: number; gst: number; grand_total: number; tds: number; payable: number };
  claimable: boolean;
  duplicate_invoice_number: boolean;
}

export interface PostedVendorInvoice {
  id: string;
  bill_number: string;
  vendor_invoice_number: string | null;
  total_amount: string;
  balance_due: string;
}

export interface InvoiceHead {
  ledger_account_id: string;
  code: string;
  name: string;
  hsn_sac: string | null;
}

export interface InvoiceHeads {
  data: InvoiceHead[];
  gst: { society_state_code: string | null; rate_options: number[]; pre_reform_rates: number[]; reform_date: string };
}

export const vendorBillKeys = {
  all: ['vendor-bills'] as const,
  preview: (input: VendorInvoiceInput | null) => [...vendorBillKeys.all, 'preview', input] as const,
  heads: () => [...vendorBillKeys.all, 'heads'] as const,
};

/** The entries an invoice would post, recomputed by the server (no writes). Null input = nothing to preview. */
export function useBillPreview(input: VendorInvoiceInput | null) {
  return useQuery({
    queryKey: vendorBillKeys.preview(input),
    enabled: input !== null,
    retry: false,
    meta: { suppressToast: true },
    queryFn: () => api.post<{ data: BillPreview }>('/purchases/bills/preview', input).then((res) => res.data),
  });
}

/** Expense heads (with HSN/SAC) and the society's GST rates, for the line grid. */
export function useInvoiceHeads() {
  return useQuery({
    queryKey: vendorBillKeys.heads(),
    meta: { suppressToast: true },
    queryFn: () => api.get<InvoiceHeads>('/purchases/expense-heads/summary'),
  });
}

export function useCreateVendorInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VendorInvoiceInput) =>
      api.post<{ data: PostedVendorInvoice }>('/purchases/bills', input).then((res) => res.data),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.aging() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
      queryClient.invalidateQueries({ queryKey: vendorBillKeys.all });
    },
  });
}

