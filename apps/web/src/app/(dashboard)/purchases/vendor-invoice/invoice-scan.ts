import type { Vendor } from '@communityos/shared';
import type { InvoiceOcrResult } from '@/hooks/use-ocr';
import type { InvoiceHeader, InvoiceRow } from './invoice-model';

/** What "Scan invoice with AI" fills: the header and line 1 (EXP-12 keeps the scan). */
export interface ScannedInvoice {
  vendorId: string | null;
  header: Partial<Pick<InvoiceHeader, 'invoiceNo' | 'invoiceDate' | 'dueDate'>>;
  row: Partial<Pick<InvoiceRow, 'description' | 'amount'>>;
  /** GST rate read off the invoice, if any; the form puts it on the row's kind of GST. */
  gstRate: number | null;
  confidence: number;
}

function matchVendor(result: InvoiceOcrResult, vendors: readonly Vendor[]): Vendor | undefined {
  const gstin = result.vendor_gstin?.toLowerCase();
  const byGstin = gstin ? vendors.find((v) => (v.gstin ?? '').toLowerCase() === gstin) : undefined;
  if (byGstin) return byGstin;
  const name = result.vendor_name?.toLowerCase();
  return name ? vendors.find((v) => v.name.toLowerCase().includes(name)) : undefined;
}

/** The amount before GST: line 1, else the subtotal, else total − GST, else the total. */
function taxableOf(result: InvoiceOcrResult): number | null {
  const first = result.line_items?.[0];
  if (first?.amount != null) return first.amount;
  if (result.subtotal != null) return result.subtotal;
  if (result.total_amount != null && result.gst_amount != null) return Math.max(0, result.total_amount - result.gst_amount);
  return result.total_amount ?? null;
}

function rateOf(result: InvoiceOcrResult, taxable: number | null): number | null {
  const lineRate = result.line_items?.[0]?.gst_rate;
  if (lineRate != null) return lineRate;
  if (result.gst_amount != null && taxable) return Math.round((result.gst_amount / taxable) * 100);
  return null;
}

export function scanToInvoice(result: InvoiceOcrResult, vendors: readonly Vendor[], fixedVendorId?: string): ScannedInvoice {
  const taxable = taxableOf(result);
  const header: ScannedInvoice['header'] = {};
  if (result.invoice_number) header.invoiceNo = result.invoice_number.slice(0, 50);
  if (result.invoice_date) header.invoiceDate = result.invoice_date;
  if (result.due_date) header.dueDate = result.due_date;
  const row: ScannedInvoice['row'] = {};
  if (taxable != null) row.amount = String(Math.round(taxable * 100) / 100);
  const description = result.line_items?.[0]?.description;
  if (description) row.description = description.slice(0, 500);
  return {
    vendorId: fixedVendorId ?? matchVendor(result, vendors)?.id ?? null,
    header,
    row,
    gstRate: rateOf(result, taxable),
    confidence: result.confidence ?? 0,
  };
}
