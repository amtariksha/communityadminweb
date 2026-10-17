import type { Invoice } from '@communityos/shared';

/** The Party filter on /invoices: whose invoices to list (INC-05). */
export const INVOICE_PARTY_OPTIONS = [
  { value: '', label: 'All payers' },
  { value: 'unit', label: 'Units' },
  { value: 'customer', label: 'Non-members' },
] as const;

export type InvoiceParty = (typeof INVOICE_PARTY_OPTIONS)[number]['value'];

export interface InvoicePayerLabel {
  kind: 'unit' | 'non_member';
  primary: string;
  secondary: string;
  tertiary: string | null;
}

type PayerFields = Pick<Invoice, 'unit_id'> &
  Partial<
    Pick<
      Invoice,
      'unit_number' | 'block' | 'owner_name' | 'tenant_name' | 'customer_id' | 'customer_name'
    >
  >;

/** One list row's "Payer" cell: the unit and its owner, or the non-member payer. */
export function describeInvoicePayer(invoice: PayerFields): InvoicePayerLabel {
  if (invoice.customer_id) {
    return {
      kind: 'non_member',
      primary: invoice.customer_name ?? 'Non-member',
      secondary: 'Non-member',
      tertiary: null,
    };
  }
  const unit = invoice.unit_number
    ? `${invoice.unit_number}${invoice.block ? ` (Block ${invoice.block})` : ''}`
    : (invoice.unit_id ?? '—');
  return {
    kind: 'unit',
    primary: unit,
    secondary: invoice.owner_name ?? '—',
    tertiary: invoice.tenant_name ? `(Tenant: ${invoice.tenant_name})` : null,
  };
}
