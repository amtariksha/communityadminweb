/** The three fields of the Tax registration card, held as form text. */
export interface TaxRegistrationForm {
  gstin: string;
  pan: string;
  society_registration_no: string;
}

export type TaxRegistrationErrors = Partial<Record<keyof TaxRegistrationForm, string>>;

// Same patterns as the API (GSTIN: state code, PAN, entity number, Z, check
// character). Typing is accepted in either case and upper-cased on save.
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const clean = (value: string): string => value.trim().toUpperCase();

export function readTaxRegistration(settings: unknown): TaxRegistrationForm {
  const value = (settings ?? {}) as Record<string, unknown>;
  const text = (key: string): string => (typeof value[key] === 'string' ? (value[key] as string) : '');
  return {
    gstin: text('gstin'),
    pan: text('pan'),
    society_registration_no: text('society_registration_no'),
  };
}

export function taxRegistrationErrors(form: TaxRegistrationForm): TaxRegistrationErrors {
  const errors: TaxRegistrationErrors = {};
  if (form.gstin.trim() !== '' && !GSTIN.test(clean(form.gstin))) {
    errors.gstin = 'GSTIN must be 15 characters, e.g. 29ABCDE1234F1Z5.';
  }
  if (form.pan.trim() !== '' && !PAN.test(clean(form.pan))) {
    errors.pan = 'PAN must be 10 characters, e.g. ABCDE1234F.';
  }
  if (form.society_registration_no.trim().length > 50) {
    errors.society_registration_no = 'Use at most 50 characters.';
  }
  return errors;
}

/** What PATCH /tenants/:id/settings stores; a blank field is sent as null so it can be cleared. */
export function toTaxRegistrationPayload(form: TaxRegistrationForm): Record<keyof TaxRegistrationForm, string | null> {
  const orNull = (value: string): string | null => (value === '' ? null : value);
  return {
    gstin: orNull(clean(form.gstin)),
    pan: orNull(clean(form.pan)),
    society_registration_no: orNull(form.society_registration_no.trim()),
  };
}

export function sameTaxRegistration(a: TaxRegistrationForm, b: TaxRegistrationForm): boolean {
  const pa = toTaxRegistrationPayload(a);
  const pb = toTaxRegistrationPayload(b);
  return pa.gstin === pb.gstin && pa.pan === pb.pan && pa.society_registration_no === pb.society_registration_no;
}
