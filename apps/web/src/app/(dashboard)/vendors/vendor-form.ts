import type { Vendor } from '@communityos/shared';
import type { TdsConfig } from '@/hooks/use-tax';

/**
 * The Add / Edit Vendor form (VEND-02, VEND-03): its values, the request
 * bodies built from them and the TDS rate default. Pure, so it is tested
 * without a browser.
 */
export interface VendorFormValues {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  pan: string;
  gstin: string;
  bank_name: string;
  bank_branch: string;
  bank_account_number: string;
  bank_ifsc: string;
  tds_section: string;
  /** Percent as typed; blank = none. */
  tds_rate: string;
  is_active: boolean;
}

export type VendorPayload = Partial<{
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  pan: string | null;
  gstin: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  tds_section: string | null;
  tds_rate: number | null;
  is_active: boolean;
}>;

type TextField = Exclude<keyof VendorFormValues, 'is_active' | 'tds_rate' | 'name'>;

const TEXT_FIELDS: readonly TextField[] = [
  'contact_person', 'phone', 'email', 'address', 'pan', 'gstin',
  'bank_name', 'bank_branch', 'bank_account_number', 'bank_ifsc', 'tds_section',
];

export function emptyVendorForm(): VendorFormValues {
  return {
    name: '', contact_person: '', phone: '', email: '', address: '', pan: '', gstin: '',
    bank_name: '', bank_branch: '', bank_account_number: '', bank_ifsc: '',
    tds_section: '', tds_rate: '', is_active: true,
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Bank details live in the `bank_details` JSON; tolerate the older key spellings. */
export function vendorBank(vendor: Vendor): { name: string; branch: string; account: string; ifsc: string } {
  const bd = (vendor as unknown as { bank_details?: Record<string, unknown> | null; bank_branch?: string | null })
    .bank_details ?? {};
  const column = (vendor as unknown as { bank_branch?: string | null }).bank_branch;
  return {
    name: text(bd.bank_name ?? bd.bankName),
    branch: text(bd.bank_branch ?? bd.branch ?? column),
    account: text(bd.account_number ?? bd.bank_account_number ?? bd.accountNumber),
    ifsc: text(bd.ifsc ?? bd.bank_ifsc),
  };
}

export function vendorFormFromVendor(vendor: Vendor): VendorFormValues {
  const bank = vendorBank(vendor);
  return {
    name: vendor.name,
    contact_person: vendor.contact_person ?? '',
    // The form takes the 10 digits; the API stores +91XXXXXXXXXX.
    phone: (vendor.phone ?? '').replace(/^\+91/, ''),
    email: vendor.email ?? '',
    address: vendor.address ?? '',
    pan: vendor.pan ?? '',
    gstin: vendor.gstin ?? '',
    bank_name: bank.name,
    bank_branch: bank.branch,
    bank_account_number: bank.account,
    bank_ifsc: bank.ifsc,
    tds_section: vendor.tds_section ?? '',
    tds_rate: vendor.tds_rate == null ? '' : String(Number(vendor.tds_rate)),
    is_active: vendor.is_active,
  };
}

function rateValue(typed: string): number | null {
  const trimmed = typed.trim();
  return trimmed === '' ? null : Number(trimmed);
}

/** Add Vendor: every field, blanks as null. */
export function createVendorPayload(values: VendorFormValues): VendorPayload {
  const payload: VendorPayload = { name: values.name.trim(), tds_rate: rateValue(values.tds_rate) };
  for (const field of TEXT_FIELDS) payload[field] = values[field].trim() || null;
  return payload;
}

const BANK_FIELDS: readonly TextField[] = ['bank_name', 'bank_branch', 'bank_account_number', 'bank_ifsc'];

const changed = (initial: VendorFormValues, values: VendorFormValues, field: TextField): boolean =>
  values[field].trim() !== initial[field].trim();

/**
 * Edit Vendor: only what changed, so a field the form never loaded is never
 * wiped. A bank change sends all four bank fields: an API older than VEND-02
 * rebuilds the bank details from the fields it is sent.
 */
export function updateVendorPayload(initial: VendorFormValues, values: VendorFormValues): VendorPayload {
  const payload: VendorPayload = {};
  if (values.name.trim() !== initial.name.trim()) payload.name = values.name.trim();
  const bankChanged = BANK_FIELDS.some((field) => changed(initial, values, field));
  for (const field of TEXT_FIELDS) {
    const isBank = BANK_FIELDS.includes(field);
    if (isBank ? bankChanged : changed(initial, values, field)) payload[field] = values[field].trim() || null;
  }
  if (rateValue(values.tds_rate) !== rateValue(initial.tds_rate)) payload.tds_rate = rateValue(values.tds_rate);
  if (values.is_active !== initial.is_active) payload.is_active = values.is_active;
  return payload;
}

/** The rate % configured for a TDS section code, if any. */
export function sectionRate(config: TdsConfig | null | undefined, code: string): number | null {
  const match = config?.sections.find((section) => section.code.toLowerCase() === code.toLowerCase());
  return match ? match.rate : null;
}

/** Choosing a section fills a blank rate with the section's configured rate. */
export function chooseTdsSection(
  values: VendorFormValues,
  code: string,
  config: TdsConfig | null | undefined,
): VendorFormValues {
  const rate = sectionRate(config, code);
  const fillRate = values.tds_rate.trim() === '' && rate !== null;
  return { ...values, tds_section: code, tds_rate: fillRate ? String(rate) : values.tds_rate };
}

/** "2% (194C)", "194C", "2%" or "—". */
export function tdsText(vendor: Pick<Vendor, 'tds_section' | 'tds_rate'>): string {
  const rate = vendor.tds_rate == null ? null : `${Number(vendor.tds_rate)}%`;
  const section = vendor.tds_section || null;
  if (rate && section) return `${rate} (${section})`;
  return rate ?? section ?? '—';
}
