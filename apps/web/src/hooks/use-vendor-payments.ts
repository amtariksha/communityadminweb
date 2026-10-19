'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { ledgerKeys } from '@/hooks/use-ledger';
import { purchaseKeys } from '@/hooks/use-purchases';
import { vendorKeys } from '@/hooks/use-vendors';

/**
 * Vendor payments with allocation, advances and payments without invoice
 * (EXP-13 API, EXP-14 page): GET /purchases/vendors/:id/open-items and
 * POST /purchases/payments. Amounts from the API are NUMERIC strings.
 */

export interface OpenBill {
  id: string;
  bill_number: string;
  vendor_invoice_number: string | null;
  bill_date: string;
  due_date: string | null;
  payee_name: string | null;
  status: string;
  heads: string | null;
  invoice_amount: string;
  remaining: string;
  tds_amount: string;
}

export interface OpenCredit {
  id: string;
  type: 'advance_payment' | 'debit_note';
  voucher_number: string | null;
  date: string;
  amount: string;
  unallocated: string;
}

export interface VendorOpenItems {
  bills: OpenBill[];
  credits: OpenCredit[];
  totals: { dues: string; advance: string };
}

export type VendorPaymentKind = 'against_invoice' | 'advance' | 'without_invoice';

export interface VendorPaymentInput {
  vendor_id: string;
  kind: VendorPaymentKind;
  payment_date: string;
  bank_account_id: string;
  payment_mode: string;
  amount: number;
  instrument_number?: string | null;
  instrument_date?: string | null;
  allocations: Array<{ bill_id: string; amount: number }>;
  write_off_amount?: number;
  write_off_account_id?: string | null;
  tds_amount?: number;
  expense_account_id?: string | null;
  notes?: string | null;
}

export interface PostedVendorPayment {
  payment: { id: string; voucher_number: string; amount: string };
  bills: Array<{ bill_id: string; status: string }>;
}

export const vendorPaymentKeys = {
  all: ['vendor-payments'] as const,
  openItems: (vendorId: string) => [...vendorPaymentKeys.all, 'open-items', vendorId] as const,
};

/** Open invoices and unallocated advances; `null` from an API older than EXP-13 (404). */
export function useVendorOpenItems(vendorId: string) {
  return useQuery({
    queryKey: vendorPaymentKeys.openItems(vendorId),
    enabled: vendorId !== '',
    retry: false,
    meta: { suppressToast: true },
    queryFn: async (): Promise<VendorOpenItems | null> => {
      try {
        return (await api.get<{ data: VendorOpenItems }>(`/purchases/vendors/${vendorId}/open-items`)).data;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  });
}

export function useCreateVendorPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VendorPaymentInput) =>
      api.post<{ data: PostedVendorPayment }>('/purchases/payments', input).then((res) => res.data),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: vendorPaymentKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}
