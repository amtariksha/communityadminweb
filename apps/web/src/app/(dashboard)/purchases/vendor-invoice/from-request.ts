'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { purchaseRequestKeys, usePurchaseRequestDetail, type PRDetail } from '@/hooks/use-purchase-requests';
import { purchaseKeys } from '@/hooks/use-purchases';
import { vendorBillKeys, type PostedVendorInvoice, type VendorInvoiceInput } from '@/hooks/use-vendor-bills';
import { api } from '@/lib/api';
import { emptyRow, SHOWN_ROWS, type InvoiceHeader, type InvoiceRow } from './invoice-model';

/**
 * EXP-10 — Post a vendor invoice opened from an approved purchase request
 * (`?from_request=<id>`): its lines and vendor fill the form, and Post
 * Entries converts the request (POST /purchases/requests/:id/convert), so
 * the request becomes "Converted to invoice" with the bill.
 */

/** The request's lines as invoice rows: head, description, HSN/SAC, taxable amount and its GST rate. */
export function rowsFromRequest(detail: PRDetail): InvoiceRow[] {
  const rows = detail.lines
    .filter((line) => line.ledger_account_id && Number(line.taxable_amount) > 0)
    .map((line) => ({
      ...emptyRow(),
      head: line.ledger_account_id ?? '',
      description: line.description ?? '',
      hsnSac: line.hsn_sac ?? '',
      amount: String(Number(line.taxable_amount)),
      cgstSgstRate: line.gst_type === 'cgst_sgst' ? String(Number(line.gst_rate)) : '',
      igstRate: line.gst_type === 'igst' ? String(Number(line.gst_rate)) : '',
    }));
  const blanks = Array.from({ length: Math.max(0, SHOWN_ROWS - rows.length) }, emptyRow);
  return [...rows, ...blanks];
}

/** Fills the form once from the request; returns whether the request has been read. */
export function useRequestPrefill(
  fromRequestId: string | undefined,
  setHeader: (fn: (h: InvoiceHeader) => InvoiceHeader) => void,
  setRows: (rows: InvoiceRow[]) => void,
): { ready: boolean; detail: PRDetail | null } {
  const detail = usePurchaseRequestDetail(fromRequestId ?? null);
  const filled = useRef('');
  const stored = detail.data ?? null;
  useEffect(() => {
    if (!stored || filled.current === stored.purchase_request.id) return;
    filled.current = stored.purchase_request.id;
    setRows(rowsFromRequest(stored));
    const vendorId = stored.purchase_request.vendor_id;
    if (vendorId) setHeader((h) => ({ ...h, vendorId: h.vendorId || vendorId }));
  }, [stored, setHeader, setRows]);
  return { ready: !fromRequestId || detail.data !== undefined, detail: stored };
}

export function useConvertRequestToInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, input }: { requestId: string; input: VendorInvoiceInput }) =>
      api.post<{ data: PostedVendorInvoice }>(`/purchases/requests/${requestId}/convert`, input).then((res) => res.data),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: purchaseRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: vendorBillKeys.all });
    },
  });
}
