import type { Vendor } from '@communityos/shared';
import type { InvoiceHead, TdsBasis, VendorInvoiceInput, VendorInvoiceLineInput } from '@/hooks/use-vendor-bills';

/**
 * The Post vendor invoice form (EXP-12, screen EXP-S8) as plain data: seven
 * rows shown, up to fifty; a row carries CGST/SGST or IGST, never both; the
 * vendor's defaults (VEND-05) fill a new invoice. The server recomputes every
 * figure (preview and post); nothing here does tax arithmetic.
 */

export const SHOWN_ROWS = 7;
export const MAX_ROWS = 50;
/** Due date = invoice date + this many days (requirements default; no setting yet). */
export const DEFAULT_CREDIT_DAYS = 30;

export interface InvoiceRow {
  head: string;
  description: string;
  hsnSac: string;
  amount: string;
  /** Combined CGST + SGST rate, e.g. "18" (9 + 9). */
  cgstSgstRate: string;
  igstRate: string;
}

export interface InvoiceHeader {
  vendorId: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  tdsValue: string;
  tdsBasis: TdsBasis;
  tdsSection: string;
  payeeName: string;
}

export const emptyRow = (): InvoiceRow => ({ head: '', description: '', hsnSac: '', amount: '', cgstSgstRate: '', igstRate: '' });

export const emptyRows = (count = SHOWN_ROWS): InvoiceRow[] => Array.from({ length: count }, emptyRow);

export function isUsed(row: InvoiceRow): boolean {
  return row.head !== '' || row.amount.trim() !== '' || row.description.trim() !== '';
}

/** What stops a used row from posting, or null. */
export function rowIssue(row: InvoiceRow): string | null {
  if (!isUsed(row)) return null;
  if (row.cgstSgstRate !== '' && row.igstRate !== '') return 'Choose CGST/SGST or IGST';
  if (row.head === '') return 'Pick an expense head';
  const amount = Number(row.amount);
  if (!(amount > 0)) return 'Enter an amount above 0';
  return null;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function lineOf(row: InvoiceRow): VendorInvoiceLineInput {
  const gstType = row.cgstSgstRate !== '' ? 'cgst_sgst' : row.igstRate !== '' ? 'igst' : 'none';
  const rate = gstType === 'cgst_sgst' ? row.cgstSgstRate : gstType === 'igst' ? row.igstRate : '0';
  return {
    ledger_account_id: row.head,
    description: row.description.trim() || null,
    hsn_sac: row.hsnSac.trim() || null,
    taxable_amount: Math.round(Number(row.amount) * 100) / 100,
    gst_type: gstType,
    gst_rate: Number(rate),
  };
}

/** The first thing to fix before the form can post, or null. */
export function formIssue(header: InvoiceHeader, rows: readonly InvoiceRow[]): string | null {
  if (!header.vendorId) return 'Pick the vendor';
  if (!header.invoiceNo.trim()) return 'Enter the vendor’s invoice number';
  if (!header.invoiceDate || !header.dueDate) return 'Enter the invoice and due dates';
  if (header.dueDate < header.invoiceDate) return 'Due date cannot be before the invoice date';
  const used = rows.filter(isUsed);
  if (used.length === 0) return 'Enter at least one line';
  const issue = used.map(rowIssue).find((message) => message !== null);
  if (issue) return issue;
  if (Number(header.tdsValue) > 0 && !header.tdsSection) return 'Choose the TDS section';
  return null;
}

/** The request body, or null while the form cannot post. */
export function toInvoiceInput(header: InvoiceHeader, rows: readonly InvoiceRow[]): VendorInvoiceInput | null {
  if (formIssue(header, rows) !== null) return null;
  const tdsValue = Number(header.tdsValue);
  return {
    vendor_id: header.vendorId,
    vendor_invoice_number: header.invoiceNo.trim(),
    bill_date: header.invoiceDate,
    due_date: header.dueDate,
    lines: rows.filter(isUsed).map(lineOf),
    tds: tdsValue > 0 ? { basis: header.tdsBasis, value: tdsValue, section: header.tdsSection || null } : null,
    payee_name: header.payeeName.trim() || null,
  };
}

const rateText = (value: number | string | null | undefined): string =>
  value === null || value === undefined || value === '' ? '' : String(Number(value));

/** Line 1 from the vendor's defaults: its expense head (with the head's HSN/SAC) and GST rate. */
export function defaultRow(vendor: Vendor | undefined, heads: readonly InvoiceHead[]): InvoiceRow {
  const row = emptyRow();
  if (!vendor) return row;
  const head = heads.find((h) => h.ledger_account_id === vendor.default_expense_account_id);
  const halves = vendor.default_cgst_rate ?? null;
  return {
    ...row,
    head: head?.ledger_account_id ?? '',
    hsnSac: head?.hsn_sac ?? '',
    cgstSgstRate: halves === null ? '' : rateText(Number(halves) * 2),
    igstRate: rateText(vendor.default_igst_rate),
  };
}

/** TDS and payee from the vendor: its rate as a percent without GST, its section, its payee name. */
export function vendorHeaderDefaults(vendor: Vendor | undefined): Pick<InvoiceHeader, 'tdsValue' | 'tdsBasis' | 'tdsSection' | 'payeeName'> {
  return {
    tdsValue: vendor?.tds_rate ? String(Number(vendor.tds_rate)) : '',
    tdsBasis: 'percent_excl_gst',
    tdsSection: vendor?.tds_section ?? '',
    payeeName: vendor?.payee_name || vendor?.name || '',
  };
}
