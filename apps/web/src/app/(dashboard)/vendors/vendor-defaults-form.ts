import type { Vendor } from '@communityos/shared';

/**
 * VEND-05 — the vendor's accounting defaults on the vendor form, which fill
 * a new invoice from the vendor: expense head, GST (none, CGST + SGST, or
 * IGST, at one of the society's rates), vendor type, payee name, GST state
 * code and legal name. The API stores CGST and SGST as equal halves.
 */

export type DefaultGstKind = 'none' | 'cgst_sgst' | 'igst';
export type VendorType = '' | 'company' | 'non_company' | 'professional';

export interface VendorDefaultsValues {
  head: string;
  gstKind: DefaultGstKind;
  /** The combined rate as chosen, e.g. "18" for 9 + 9. */
  gstRate: string;
  vendorType: VendorType;
  payeeName: string;
  stateCode: string;
  legalName: string;
}

export interface VendorDefaultsPayload {
  default_expense_account_id: string | null;
  default_igst_rate: number | null;
  default_cgst_rate: number | null;
  default_sgst_rate: number | null;
  vendor_type: Exclude<VendorType, ''> | null;
  payee_name: string | null;
  state_code: string | null;
  legal_name: string | null;
}

export const VENDOR_TYPE_OPTIONS: ReadonlyArray<[Exclude<VendorType, ''>, string]> = [
  ['company', 'Company'],
  ['non_company', 'Non Company'],
  ['professional', 'Professional'],
];

export function emptyDefaults(): VendorDefaultsValues {
  return { head: '', gstKind: 'none', gstRate: '', vendorType: '', payeeName: '', stateCode: '', legalName: '' };
}

const num = (value: number | string | null | undefined): number | null =>
  value === null || value === undefined || value === '' ? null : Number(value);

export function defaultsFromVendor(vendor: Vendor): VendorDefaultsValues {
  const igst = num(vendor.default_igst_rate);
  const cgst = num(vendor.default_cgst_rate);
  const gstKind: DefaultGstKind = igst !== null ? 'igst' : cgst !== null ? 'cgst_sgst' : 'none';
  const rate = igst ?? (cgst !== null ? cgst * 2 : null);
  return {
    head: vendor.default_expense_account_id ?? '',
    gstKind,
    gstRate: rate === null ? '' : String(rate),
    vendorType: (vendor.vendor_type ?? '') as VendorType,
    payeeName: vendor.payee_name ?? '',
    stateCode: vendor.state_code ?? '',
    legalName: vendor.legal_name ?? '',
  };
}

/** The state code as typed, else the first two digits of the GSTIN. */
function stateCodeOf(values: VendorDefaultsValues, gstin: string): string | null {
  const typed = values.stateCode.trim();
  if (typed) return typed;
  const fromGstin = /^(\d{2})/.exec(gstin.trim());
  return fromGstin ? fromGstin[1] : null;
}

export function defaultsPayload(values: VendorDefaultsValues, gstin: string): VendorDefaultsPayload {
  const rate = values.gstKind === 'none' || values.gstRate === '' ? null : Number(values.gstRate);
  const half = rate === null ? null : Math.round((rate / 2) * 100) / 100;
  return {
    default_expense_account_id: values.head || null,
    default_igst_rate: values.gstKind === 'igst' ? rate : null,
    default_cgst_rate: values.gstKind === 'cgst_sgst' ? half : null,
    default_sgst_rate: values.gstKind === 'cgst_sgst' ? half : null,
    vendor_type: values.vendorType || null,
    payee_name: values.payeeName.trim() || null,
    state_code: stateCodeOf(values, gstin),
    legal_name: values.legalName.trim() || null,
  };
}

const RATE_KEYS = ['default_igst_rate', 'default_cgst_rate', 'default_sgst_rate'] as const;

/** Edit: only the defaults that changed; the three rates always travel together. */
export function changedDefaultsPayload(
  initial: VendorDefaultsValues,
  values: VendorDefaultsValues,
  initialGstin: string,
  gstin: string,
): Partial<VendorDefaultsPayload> {
  const before = defaultsPayload(initial, initialGstin);
  const after = defaultsPayload(values, gstin);
  const changes: Partial<VendorDefaultsPayload> = {};
  const ratesChanged = RATE_KEYS.some((key) => before[key] !== after[key]);
  for (const key of Object.keys(after) as Array<keyof VendorDefaultsPayload>) {
    const isRate = (RATE_KEYS as readonly string[]).includes(key);
    if (isRate ? ratesChanged : before[key] !== after[key]) {
      (changes as Record<string, unknown>)[key] = after[key];
    }
  }
  return changes;
}
