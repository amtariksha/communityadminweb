'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { purchaseKeys } from '@/hooks/use-purchases';
import { vendorLedgerKeys } from '@/hooks/use-vendor-ledger';
import { vendorBillKeys, type PostedVendorInvoice, type VendorInvoiceInput } from '@/hooks/use-vendor-bills';
import { api } from '@/lib/api';
import { emptyRow, SHOWN_ROWS, type InvoiceHeader, type InvoiceRow } from './invoice-model';

/**
 * Edit a vendor invoice from its statement (EXP-S10, D2): the form opens
 * filled from the invoice (`?edit=<billId>`), and Post Entries sends the
 * lines to PATCH /purchases/bills/:id, which reverses the old journal with
 * a linked inverse entry and posts the new one (EXP-04 / EXP-11). Only an
 * invoice nothing has been set against can be edited; the server refuses
 * the rest.
 */

export interface EditableBill {
  id: string;
  vendor_id: string;
  bill_number: string;
  vendor_invoice_number: string | null;
  bill_date: string;
  due_date: string | null;
  tds_basis: 'percent_excl_gst' | 'amount' | null;
  tds_value: string | null;
  tds_amount: string;
  tds_section: string | null;
  payee_name: string | null;
}

export interface EditableBillLine {
  ledger_account_id: string | null;
  description: string | null;
  hsn_sac: string | null;
  taxable_amount: string;
  gst_type: string;
  gst_rate: string;
}

const day = (value: string | null): string => (value ?? '').slice(0, 10);
const rate = (value: string): string => String(Number(value));

/** Why an invoice cannot be edited on this form, or null. */
export function editIssue(lines: readonly EditableBillLine[]): string | null {
  if (lines.some((line) => line.gst_type === 'unsplit')) {
    return 'This invoice was posted before GST was kept per line. Cancel it and post it again.';
  }
  return lines.length === 0 ? 'This invoice has no lines to edit.' : null;
}

export function headerFromBill(bill: EditableBill): Partial<InvoiceHeader> {
  const tdsValue = bill.tds_basis === 'percent_excl_gst' ? bill.tds_value : Number(bill.tds_amount) > 0 ? bill.tds_amount : null;
  return {
    vendorId: bill.vendor_id,
    invoiceNo: bill.vendor_invoice_number ?? bill.bill_number,
    invoiceDate: day(bill.bill_date),
    dueDate: day(bill.due_date) || day(bill.bill_date),
    tdsValue: tdsValue && Number(tdsValue) > 0 ? String(Number(tdsValue)) : '',
    tdsBasis: bill.tds_basis === 'amount' || (!bill.tds_basis && Number(bill.tds_amount) > 0) ? 'amount' : 'percent_excl_gst',
    tdsSection: bill.tds_section ?? '',
    payeeName: bill.payee_name ?? '',
  };
}

export function rowsFromBill(lines: readonly EditableBillLine[]): InvoiceRow[] {
  const rows = lines.map((line) => ({
    ...emptyRow(),
    head: line.ledger_account_id ?? '',
    description: line.description ?? '',
    hsnSac: line.hsn_sac ?? '',
    amount: String(Number(line.taxable_amount)),
    cgstSgstRate: line.gst_type === 'cgst_sgst' ? rate(line.gst_rate) : '',
    igstRate: line.gst_type === 'igst' ? rate(line.gst_rate) : '',
  }));
  return [...rows, ...Array.from({ length: Math.max(0, SHOWN_ROWS - rows.length) }, emptyRow)];
}

interface BillToEdit {
  bill: EditableBill;
  lines: EditableBillLine[];
}

/** Fills the form once from the invoice; `issue` says why it cannot be edited here. */
export function useBillPrefill(
  billId: string | undefined,
  setHeader: (fn: (h: InvoiceHeader) => InvoiceHeader) => void,
  setRows: (rows: InvoiceRow[]) => void,
): { bill: EditableBill | null; issue: string | null; loading: boolean } {
  const query = useQuery({
    queryKey: [...vendorBillKeys.all, 'edit', billId ?? ''],
    enabled: Boolean(billId),
    queryFn: async (): Promise<BillToEdit> => {
      const [detail, lines] = await Promise.all([
        api.get<{ data: { bill: EditableBill } }>(`/purchases/bills/${billId}`),
        api.get<{ data: EditableBillLine[] }>(`/purchases/bills/${billId}/lines`),
      ]);
      return { bill: detail.data.bill, lines: lines.data };
    },
  });
  const filled = useRef('');
  const found = query.data;
  const issue = found ? editIssue(found.lines) : null;
  useEffect(() => {
    if (!found || issue || filled.current === found.bill.id) return;
    filled.current = found.bill.id;
    setHeader((h) => ({ ...h, ...headerFromBill(found.bill) }));
    setRows(rowsFromBill(found.lines));
  }, [found, issue, setHeader, setRows]);
  return { bill: found?.bill ?? null, issue, loading: Boolean(billId) && query.isLoading };
}

/** The body PATCH /purchases/bills/:id takes: the invoice without its vendor (which stays). */
export function editBody(input: VendorInvoiceInput): Omit<VendorInvoiceInput, 'vendor_id'> {
  const { vendor_id: _vendor, ...body } = input;
  return body;
}

export function useEditVendorInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, input }: { billId: string; input: VendorInvoiceInput }) =>
      api.patch<{ data: PostedVendorInvoice }>(`/purchases/bills/${billId}`, editBody(input)).then((res) => res.data),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: vendorBillKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: vendorLedgerKeys.all });
    },
  });
}
