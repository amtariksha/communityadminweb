import type { ImportPreviewColumn } from '@/components/import/import-rows-table';

/** The By Vendors › Bulk Posting jobs (EXP-26, screen EXP-S11) and their template columns. */
export interface ExpenseImport {
  type: string;
  label: string;
  description: string;
  columns: readonly ImportPreviewColumn[];
}

export const EXPENSE_IMPORTS_ENDPOINT = '/purchases/imports';

const PAYMENT_COLUMNS: readonly ImportPreviewColumn[] = [
  { key: 'vendor', label: 'Vendor' },
  { key: 'payment_date', label: 'Payment Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'bank_code', label: 'Bank Ledger Code' },
  { key: 'mode', label: 'Mode' },
  { key: 'instrument_no', label: 'Instrument No' },
  { key: 'instrument_date', label: 'Instrument Date' },
];

export const OPENING_BALANCE_IMPORT: ExpenseImport = {
  type: 'vendor_opening_balance',
  label: 'Vendor opening balances',
  description: 'Use once, when the society’s books start on this system: what each vendor is owed (Cr) or holds as an advance (Dr). Refused for a vendor that already has invoices.',
  columns: [
    { key: 'vendor', label: 'Vendor' },
    { key: 'amount', label: 'Amount' },
    { key: 'side', label: 'Dr/Cr' },
    { key: 'as_of', label: 'As-of Date' },
  ],
};

export const BATCH_IMPORTS: readonly ExpenseImport[] = [
  {
    type: 'vendor_invoice',
    label: 'Vendor invoices',
    description: 'One row per line; rows with the same vendor and Invoice No make one invoice, posted as Post Invoice posts it.',
    columns: [
      { key: 'vendor', label: 'Vendor' },
      { key: 'invoice_no', label: 'Invoice No' },
      { key: 'bill_date', label: 'Invoice Date' },
      { key: 'due_date', label: 'Due Date' },
      { key: 'head_code', label: 'Head Code' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount' },
      { key: 'gst_type', label: 'GST Type' },
      { key: 'gst_rate', label: 'GST %' },
      { key: 'tds_section', label: 'TDS Section' },
      { key: 'tds_percent', label: 'TDS %' },
    ],
  },
  {
    type: 'vendor_payment',
    label: 'Vendor payments',
    description: 'One payment per row, set against the vendor invoice it names.',
    columns: [...PAYMENT_COLUMNS, { key: 'invoice_no', label: 'Invoice No' }, { key: 'tds_amount', label: 'TDS Amount' }, { key: 'tds_section', label: 'TDS Section' }],
  },
  {
    type: 'vendor_payment_without_invoice',
    label: 'Payments without invoice',
    description: 'A direct expense of the vendor, booked to the expense head.',
    columns: [...PAYMENT_COLUMNS, { key: 'head_code', label: 'Head Code' }],
  },
  { type: 'vendor_advance', label: 'Advance payments', description: 'Paid ahead of an invoice; it stays on the vendor until set against one.', columns: PAYMENT_COLUMNS },
  {
    type: 'vendor_debit_note',
    label: 'Debit notes',
    description: 'One debit note per row, set against the vendor invoice when one is named.',
    columns: [
      { key: 'vendor', label: 'Vendor' },
      { key: 'note_date', label: 'Date' },
      { key: 'amount', label: 'Amount' },
      { key: 'return_code', label: 'Return Account Code' },
      { key: 'invoice_no', label: 'Invoice No' },
      { key: 'reference_no', label: 'Reference No' },
      { key: 'narration', label: 'Narration' },
    ],
  },
];

export function expenseImport(type: string): ExpenseImport | undefined {
  return [OPENING_BALANCE_IMPORT, ...BATCH_IMPORTS].find((entry) => entry.type === type);
}

export const bulkPostingHref = (type: string, door: 'grid' | 'excel'): string => `/expense-tracker/by-vendors/bulk-posting/${type}?door=${door}`;
