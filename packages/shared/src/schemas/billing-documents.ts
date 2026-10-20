import { z } from 'zod';

/**
 * How the society's billing documents look and are numbered (INC-39 –
 * INC-43, Income Tracker › Setup › Customize Invoice / Other / Payment
 * Gateway). Stored in `tenants.settings_json` and declared in
 * tenantSettingsSchema; the pages save through their own routes, which
 * merge the fields they send into the stored object.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

/** Number series of income documents (INC-41). */
export const BILLING_NUMBER_SERIES = [
  'member_invoice',
  'member_receipt',
  'credit_note',
  'debit_note',
  'non_member_invoice',
  'non_member_receipt',
  'non_member_credit_note',
] as const;

export type BillingNumberSeries = (typeof BILLING_NUMBER_SERIES)[number];

/** A prefix: up to 12 letters, digits, "-" or "/" (blank = none). */
export const DOCUMENT_PREFIX_PATTERN = /^[A-Za-z0-9/-]{0,12}$/;

export const billingNumberSeriesSchema = z.object({
  prefix: z.string().regex(DOCUMENT_PREFIX_PATTERN, 'Up to 12 letters, digits, "-" or "/"'),
  /** Digits the number is padded to: 4 makes 7 into 0007. */
  pad: z.number().int().min(1).max(8),
});

export const billingNumberingSchema = z.object({
  member_invoice: billingNumberSeriesSchema.optional(),
  member_receipt: billingNumberSeriesSchema.optional(),
  credit_note: billingNumberSeriesSchema.optional(),
  debit_note: billingNumberSeriesSchema.optional(),
  // A non-member series set here gets numbers of its own; unset, non-member
  // documents share the member series as before.
  non_member_invoice: billingNumberSeriesSchema.optional(),
  non_member_receipt: billingNumberSeriesSchema.optional(),
  non_member_credit_note: billingNumberSeriesSchema.optional(),
});

export type BillingNumberingSettings = z.infer<typeof billingNumberingSchema>;

export const issuerAddressSchema = z.object({
  line1: optionalText(200),
  line2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  pincode: z.string().regex(/^\d{6}$/, 'PinCode is 6 digits').nullable().optional(),
  phone: z.string().regex(/^\+?\d{10,15}$/, 'Phone is 10 to 15 digits').nullable().optional(),
});

/** Names printed on documents of each ledger (INC-42). */
export const entityNamesSchema = z.object({
  maintenance: z.string().trim().min(1).max(40).optional(),
  utility: z.string().trim().min(1).max(40).optional(),
  non_member: z.string().trim().min(1).max(40).optional(),
});

export const BILLING_DOCUMENT_DEFAULTS = {
  title_without_gst: 'INVOICE',
  title_with_gst: 'TAX INVOICE',
  show_last_receipts: 0,
  entity_names: { maintenance: 'Maintenance Charges', utility: 'Utility', non_member: 'Non Member Income' },
  logo_on_receipt: false,
  show_interest_breakup: false,
  publish_dues: true,
} as const;

export const billingDocumentsSchema = z.object({
  // INC-39 — Customize Invoice.
  title_without_gst: z.string().trim().min(1).max(40).optional(),
  title_with_gst: z.string().trim().min(1).max(40).optional(),
  issuer_name: optionalText(120),
  issuer_address: issuerAddressSchema.nullable().optional(),
  service_tax_no: optionalText(20),
  gstin_effective_from: isoDate.nullable().optional(),
  show_last_receipts: z.number().int().min(0).max(10).optional(),
  // INC-42 — Setup › Other.
  entity_names: entityNamesSchema.optional(),
  payment_instructions_html: z.string().max(5000).nullable().optional(),
  letterhead_object_key: z.string().max(300).nullable().optional(),
  logo_on_receipt: z.boolean().optional(),
  show_interest_breakup: z.boolean().optional(),
  publish_dues: z.boolean().optional(),
  excluded_bank_account_ids: z.array(z.string().uuid()).max(50).optional(),
});

export type BillingDocumentsSettings = z.infer<typeof billingDocumentsSchema>;

/**
 * Setup › Payment Gateway extra (INC-43): when the society pays the gateway
 * charge it does so only on orders of at least `absorb_min_amount`; smaller
 * orders pass the charge on. Per-method absorption is not offered: the
 * order is created before the payer picks a method (decision default).
 */
export const billingGatewaySchema = z.object({
  absorb_min_amount: z.number().min(0).max(10_000_000).nullable().optional(),
});

export type BillingGatewaySettings = z.infer<typeof billingGatewaySchema>;
