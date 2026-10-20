import type { ImportPreviewColumn } from '@/components/import/import-rows-table';

/**
 * Member Income › Bulk Posting (INC-S23): each job is an SB-13 import type,
 * with both doors (batch grid and Excel). A matrix appears once its first
 * job has shipped (INC-56 … INC-60).
 */
export interface MemberImport {
  type: string;
  label: string;
  description: string;
  endpoint: string;
  columns: readonly ImportPreviewColumn[];
  /** Only these roles may run it (else the finance writers). */
  roles?: readonly string[];
}

export interface MemberImportMatrix {
  heading: string;
  note?: string;
  jobs: readonly MemberImport[];
}

export const INVOICE_IMPORTS_ENDPOINT = '/invoices/imports';
export const RECEIPT_IMPORTS_ENDPOINT = '/receipts/imports';
export const BULK_POSTING_HREF = '/income/members/bulk-posting';

const UNIT_COLUMNS: readonly ImportPreviewColumn[] = [
  { key: 'unit_number', label: 'Unit No' },
  { key: 'block', label: 'Block' },
];

const INVOICE_COLUMNS: readonly ImportPreviewColumn[] = [
  ...UNIT_COLUMNS,
  { key: 'account', label: 'Account Code' },
  { key: 'amount', label: 'Amount' },
  { key: 'gst_rate', label: 'GST %' },
  { key: 'comment', label: 'Comment' },
  { key: 'invoice_date', label: 'Invoice Date' },
  { key: 'due_date', label: 'Due Date' },
  { key: 'period_from', label: 'Period From' },
  { key: 'period_to', label: 'Period To' },
];

export const MEMBER_IMPORT_MATRICES: readonly MemberImportMatrix[] = [
  {
    heading: 'Upload Opening Balances',
    note: 'Use once, when the society’s books start on this system.',
    jobs: [
      {
        type: 'unit_opening_balance',
        label: 'Opening balances of units',
        description:
          'What each unit owed, or had paid ahead, in the old books. Posted once per unit against Retained Earnings (Opening), on the accounting start date (else the first day of the current year). A row with an unknown unit is reported and the others are posted.',
        endpoint: INVOICE_IMPORTS_ENDPOINT,
        roles: ['super_admin', 'community_admin'],
        columns: [
          ...UNIT_COLUMNS,
          { key: 'opening_due', label: 'Opening Due' },
          { key: 'opening_advance', label: 'Opening Advance' },
          { key: 'as_of', label: 'As of' },
          { key: 'comment', label: 'Comment' },
        ],
      },
    ],
  },
  {
    heading: 'Post Invoices in Bulk',
    note: 'Each row is posted the way Post Invoice posts it. A wrong row stops the whole file until it is fixed.',
    jobs: [
      {
        type: 'member_invoice',
        label: 'Single-account invoices',
        description: 'One row = one invoice of one income account (parking, fines, extras), posted at once with its GST.',
        endpoint: INVOICE_IMPORTS_ENDPOINT,
        columns: INVOICE_COLUMNS,
      },
      {
        type: 'member_invoice_lines',
        label: 'Multi-line invoices',
        description: 'One row per line; the rows of one unit with the same Invoice Date make one invoice (up to 14 lines).',
        endpoint: INVOICE_IMPORTS_ENDPOINT,
        columns: [
          ...UNIT_COLUMNS,
          { key: 'account', label: 'Account Code' },
          { key: 'quantity', label: 'Quantity' },
          { key: 'amount', label: 'Amount' },
          { key: 'gst_rate', label: 'GST %' },
          { key: 'comment', label: 'Comment' },
          { key: 'invoice_date', label: 'Invoice Date' },
          { key: 'due_date', label: 'Due Date' },
        ],
      },
      {
        type: 'member_debit_note',
        label: 'Debit notes',
        description: 'One row = one debit note of one income account, on the debit note series.',
        endpoint: INVOICE_IMPORTS_ENDPOINT,
        columns: INVOICE_COLUMNS,
      },
    ],
  },
];

export const MEMBER_IMPORTS: readonly MemberImport[] = MEMBER_IMPORT_MATRICES.flatMap((matrix) => matrix.jobs);

export function memberImport(type: string): MemberImport | undefined {
  return MEMBER_IMPORTS.find((job) => job.type === type);
}

export const memberImportHref = (type: string, door: 'grid' | 'excel'): string => `${BULK_POSTING_HREF}/${type}?door=${door}`;
