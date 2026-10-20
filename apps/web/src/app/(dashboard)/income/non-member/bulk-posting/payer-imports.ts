import type { MemberImport, MemberImportMatrix } from '../../members/bulk-posting/member-imports';
import { INVOICE_IMPORTS_ENDPOINT, RECEIPT_IMPORTS_ENDPOINT } from '../../members/bulk-posting/member-imports';
import { NON_MEMBER_BASE } from '../non-member-routes';

/** Non Member Income › Bulk Posting (INC-S32, INC-62): jobs keyed by Payer ID. */
export const PAYER_BULK_POSTING_HREF = `${NON_MEMBER_BASE}/bulk-posting`;

const PAYER = { key: 'payer', label: 'Payer ID' } as const;

export const PAYER_IMPORT_MATRICES: readonly MemberImportMatrix[] = [
  {
    heading: 'Upload Opening Balances',
    note: 'One-time, at set-up: what each payer owed in the old books.',
    jobs: [
      {
        type: 'payer_opening_balance',
        label: 'Opening balances of payers',
        description: 'Posted once per payer against Retained Earnings (Opening), on the accounting start date (else the first day of the current year). A payer holds no advance. A wrong row is reported and the others are posted.',
        endpoint: INVOICE_IMPORTS_ENDPOINT,
        roles: ['super_admin', 'community_admin'],
        columns: [PAYER, { key: 'opening_due', label: 'Opening Due' }, { key: 'as_of', label: 'As of' }, { key: 'comment', label: 'Comment' }],
      },
    ],
  },
  {
    heading: 'Post Invoices & Collection in Bulk',
    note: 'Each row is posted the way the single invoice or collection is. A wrong row stops the whole file until it is fixed.',
    jobs: [
      {
        type: 'payer_invoice',
        label: 'Payer invoices',
        description: 'One row = one invoice to a payer, raised and posted at once.',
        endpoint: INVOICE_IMPORTS_ENDPOINT,
        columns: [
          PAYER,
          { key: 'account', label: 'Account Code' },
          { key: 'description', label: 'Description' },
          { key: 'amount', label: 'Amount' },
          { key: 'gst_rate', label: 'GST %' },
          { key: 'invoice_date', label: 'Invoice Date' },
          { key: 'due_date', label: 'Due Date' },
        ],
      },
      {
        type: 'payer_collection',
        label: 'Payer collections',
        description: 'One row = one collection, set against the payer’s oldest bills; more than it owes is refused.',
        endpoint: RECEIPT_IMPORTS_ENDPOINT,
        columns: [
          PAYER,
          { key: 'receipt_date', label: 'Date' },
          { key: 'amount', label: 'Amount' },
          { key: 'mode', label: 'Mode' },
          { key: 'reference_number', label: 'Payment Number' },
          { key: 'payment_bank', label: 'Payment Bank' },
          { key: 'instrument_date', label: 'Instrument Date' },
          { key: 'bank_code', label: 'Bank & Cash Account Code' },
          { key: 'comment', label: 'Comment' },
        ],
      },
    ],
  },
];

export const PAYER_IMPORTS: readonly MemberImport[] = PAYER_IMPORT_MATRICES.flatMap((matrix) => matrix.jobs);

export const payerImport = (type: string): MemberImport | undefined => PAYER_IMPORTS.find((job) => job.type === type);

export const payerImportHref = (type: string, door: 'grid' | 'excel'): string => `${PAYER_BULK_POSTING_HREF}/${type}?door=${door}`;
