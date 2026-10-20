import { BILLING_DOCUMENT_DEFAULTS, type BillingDocumentsSettings } from '@communityos/shared';
import type { DocumentSettingsInput } from '@/hooks/use-billing-documents';

/** Setup › Customize Invoice › Document titles & issuer (INC-39), held as form text. */
export interface TitlesForm {
  title_without_gst: string;
  title_with_gst: string;
  issuer_name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  service_tax_no: string;
  gstin_effective_from: string;
  show_last_receipts: string;
}

export type TitlesField = keyof TitlesForm;
export type TitlesErrors = Partial<Record<TitlesField, string>>;

const ADDRESS_FIELDS = ['line1', 'line2', 'city', 'state', 'pincode', 'phone'] as const;

export function readTitles(stored: BillingDocumentsSettings | undefined): TitlesForm {
  const value = stored ?? {};
  const address = value.issuer_address ?? {};
  return {
    title_without_gst: value.title_without_gst ?? BILLING_DOCUMENT_DEFAULTS.title_without_gst,
    title_with_gst: value.title_with_gst ?? BILLING_DOCUMENT_DEFAULTS.title_with_gst,
    issuer_name: value.issuer_name ?? '',
    line1: address.line1 ?? '',
    line2: address.line2 ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    pincode: address.pincode ?? '',
    phone: address.phone ?? '',
    service_tax_no: value.service_tax_no ?? '',
    gstin_effective_from: value.gstin_effective_from ?? '',
    show_last_receipts: String(value.show_last_receipts ?? BILLING_DOCUMENT_DEFAULTS.show_last_receipts),
  };
}

const LIMITS: ReadonlyArray<[TitlesField, number, string]> = [
  ['issuer_name', 120, 'Association name'],
  ['line1', 200, 'Address line 1'],
  ['line2', 200, 'Address line 2'],
  ['city', 100, 'City'],
  ['state', 100, 'State'],
  ['service_tax_no', 20, 'Service-tax registration no.'],
];

function titleError(text: string): string | undefined {
  const length = text.trim().length;
  return length < 1 || length > 40 ? 'Enter 1 to 40 characters.' : undefined;
}

export function titlesErrors(form: TitlesForm): TitlesErrors {
  const errors: TitlesErrors = {};
  const withoutGst = titleError(form.title_without_gst);
  const withGst = titleError(form.title_with_gst);
  if (withoutGst) errors.title_without_gst = withoutGst;
  if (withGst) errors.title_with_gst = withGst;
  for (const [field, max, label] of LIMITS) {
    if (form[field].trim().length > max) errors[field] = `${label} is up to ${max} characters.`;
  }
  if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) errors.pincode = 'PinCode is 6 digits.';
  if (form.phone.trim() && !/^\+?\d{10,15}$/.test(form.phone.trim())) errors.phone = 'Phone is 10 to 15 digits.';
  if (form.gstin_effective_from && !/^\d{4}-\d{2}-\d{2}$/.test(form.gstin_effective_from)) {
    errors.gstin_effective_from = 'Pick a date.';
  }
  const receipts = form.show_last_receipts.trim();
  if (!/^\d{1,2}$/.test(receipts) || Number(receipts) > 10) errors.show_last_receipts = 'Enter 0 to 10.';
  return errors;
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim());

/** The fields this card owns, as PUT /billing-documents/settings takes them (blank = the society's own value). */
export function toTitlesPayload(form: TitlesForm): DocumentSettingsInput {
  const address = Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, orNull(form[field])]));
  const hasAddress = Object.values(address).some((value) => value !== null);
  return {
    title_without_gst: form.title_without_gst.trim(),
    title_with_gst: form.title_with_gst.trim(),
    issuer_name: orNull(form.issuer_name),
    issuer_address: hasAddress ? address : null,
    service_tax_no: orNull(form.service_tax_no),
    gstin_effective_from: form.gstin_effective_from || null,
    show_last_receipts: Number(form.show_last_receipts.trim()),
  };
}

export function sameTitles(a: TitlesForm, b: TitlesForm): boolean {
  return JSON.stringify(toTitlesPayload(a)) === JSON.stringify(toTitlesPayload(b));
}
