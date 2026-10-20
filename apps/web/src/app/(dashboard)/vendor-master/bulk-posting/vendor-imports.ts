import type { ImportPreviewColumn } from '@/components/import/import-rows-table';

/** VEND-09 — the two Add Vendors in Bulk uploads and the columns typed in their grids. */
const COMMON: readonly ImportPreviewColumn[] = [
  { key: 'code', label: 'Vendor ID' },
  { key: 'name', label: 'Vendor Name' },
  { key: 'contact_person', label: 'Vendor Contact Name' },
  { key: 'phone', label: 'Vendor Phone' },
  { key: 'email', label: 'Vendor Email' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'pan', label: 'PAN No.' },
  { key: 'tds_rate', label: 'TDS Rate %' },
  { key: 'tds_section', label: 'TDS Section Code' },
  { key: 'address', label: 'Billing Address' },
  { key: 'bank_account_number', label: 'Bank Account No.' },
  { key: 'bank', label: 'Bank Name, Branch' },
  { key: 'bank_ifsc', label: 'Bank NEFT/IFSC Code' },
];

export const VENDOR_UPLOADS = {
  expense: {
    target: { endpoint: '/vendors/imports', type: 'vendor' },
    title: 'Vendors For Expense',
    description: 'One row per vendor, with the Add Vendor fields; Account Head is an expense ledger code. Each vendor gets its ledger under Sundry Creditors. A Vendor ID or name already used is reported, never overwritten.',
    columns: [...COMMON.slice(0, 5), { key: 'head_code', label: 'Account Head' }, ...COMMON.slice(5)],
  },
  'non-member-income': {
    target: { endpoint: '/customers/imports', type: 'non_member_party' },
    title: 'Vendors For Non Member Income',
    description: 'One row per party the society bills outside the members. Each gets its ledger under Sundry Debtors. A Vendor ID or name already used is reported, never overwritten.',
    columns: COMMON,
  },
} as const;
