import type { Customer } from '@communityos/shared';

/**
 * Add / Edit a non-member-income party (VEND-S2 opened from Vendors for
 * Non Member Income, VEND-07; Add Payer, INC-S33): saved to `customers`.
 * INC-46 adds the alternate e-mails, the Account Head and GST rate a new
 * invoice starts with, and the payer type. Pure, tested on its own.
 */
export type PayerType = 'company' | 'non_company' | 'professional';

export const PAYER_TYPES: ReadonlyArray<{ value: PayerType; label: string }> = [
  { value: 'company', label: 'Company' },
  { value: 'non_company', label: 'Non Company' },
  { value: 'professional', label: 'Professional' },
];

export type Party = Customer & {
  party_code?: string | null;
  tds_rate?: string | number | null;
  tds_section?: string | null;
  alternate_emails?: string | null;
  default_income_account_id?: string | null;
  payer_type?: PayerType | null;
  default_gst_rate?: string | number | null;
  /** INC-46 — what the payer owes on its open invoices (list rows only). */
  outstanding?: string | null;
};

export interface PartyFormValues {
  party_code: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  pan: string;
  tds_section: string;
  tds_rate: string;
  notes: string;
  bank_name: string;
  bank_branch: string;
  bank_account_number: string;
  bank_ifsc: string;
  is_active: boolean;
  alternate_emails: string;
  default_income_account_id: string;
  payer_type: PayerType | '';
  default_gst_rate: string;
}

export type PartyPayload = Partial<{
  name: string;
  party_code: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  pan: string | null;
  tds_section: string | null;
  tds_rate: number | null;
  notes: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  is_active: boolean;
  alternate_emails: string | null;
  default_income_account_id: string | null;
  payer_type: PayerType | null;
  default_gst_rate: number | null;
}>;

type TextField = Exclude<keyof PartyFormValues, 'name' | 'tds_rate' | 'is_active' | 'payer_type' | 'default_gst_rate'>;

const TEXT_FIELDS: readonly TextField[] = [
  'party_code', 'contact_person', 'phone', 'email', 'address', 'gstin', 'pan', 'tds_section', 'notes',
  'bank_name', 'bank_branch', 'bank_account_number', 'bank_ifsc', 'alternate_emails', 'default_income_account_id',
];

export function emptyPartyForm(): PartyFormValues {
  return {
    party_code: '', name: '', contact_person: '', phone: '', email: '', address: '', gstin: '', pan: '',
    tds_section: '', tds_rate: '', notes: '', bank_name: '', bank_branch: '', bank_account_number: '', bank_ifsc: '',
    is_active: true, alternate_emails: '', default_income_account_id: '', payer_type: '', default_gst_rate: '',
  };
}

export function partyFormFromParty(party: Party): PartyFormValues {
  const text = (value: string | null | undefined): string => value ?? '';
  return {
    party_code: text(party.party_code),
    name: party.name,
    contact_person: text(party.contact_person),
    phone: text(party.phone).replace(/^\+91/, ''),
    email: text(party.email),
    address: text(party.address),
    gstin: text(party.gstin),
    pan: text(party.pan),
    tds_section: text(party.tds_section),
    tds_rate: party.tds_rate == null ? '' : String(Number(party.tds_rate)),
    notes: text(party.notes),
    bank_name: text(party.bank_name),
    bank_branch: text(party.bank_branch),
    bank_account_number: text(party.bank_account_number),
    bank_ifsc: text(party.bank_ifsc),
    is_active: party.is_active,
    alternate_emails: text(party.alternate_emails),
    default_income_account_id: text(party.default_income_account_id),
    payer_type: party.payer_type ?? '',
    default_gst_rate: party.default_gst_rate == null ? '' : String(Number(party.default_gst_rate)),
  };
}

function rate(typed: string): number | null {
  return typed.trim() === '' ? null : Number(typed.trim());
}

/** What is wrong with the form, or null. */
export function partyFormError(values: PartyFormValues): string | null {
  if (!values.name.trim()) return 'Enter the party name.';
  if (values.party_code.trim() && !/^[A-Za-z0-9\-_/]{1,30}$/.test(values.party_code.trim())) {
    return 'The Id is up to 30 letters, digits, - _ or /.';
  }
  const tds = rate(values.tds_rate);
  if (tds !== null && !(tds >= 0 && tds <= 100)) return 'The TDS rate is a percent from 0 to 100.';
  return alternateEmailsError(values.alternate_emails);
}

const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

/** Alternate e-mails: comma-separated, each an address, at most five (the API's rule). */
export function alternateEmailsError(typed: string): string | null {
  const emails = typed.split(',').map((part) => part.trim()).filter(Boolean);
  if (emails.length > 5) return 'At most five alternate e-mails.';
  const bad = emails.find((email) => !EMAIL.test(email));
  return bad ? `${bad} is not an e-mail address.` : null;
}

/** Add: every field, blanks as null. */
export function createPartyPayload(values: PartyFormValues): PartyPayload {
  const payload: PartyPayload = {
    name: values.name.trim(),
    tds_rate: rate(values.tds_rate),
    payer_type: values.payer_type || null,
    default_gst_rate: rate(values.default_gst_rate),
  };
  for (const field of TEXT_FIELDS) payload[field] = values[field].trim() || null;
  return payload;
}

/** Edit: only what changed; a cleared field is sent as null and clears it. */
export function updatePartyPayload(initial: PartyFormValues, values: PartyFormValues): PartyPayload {
  const payload: PartyPayload = {};
  if (values.name.trim() !== initial.name.trim()) payload.name = values.name.trim();
  for (const field of TEXT_FIELDS) {
    if (values[field].trim() !== initial[field].trim()) payload[field] = values[field].trim() || null;
  }
  if (rate(values.tds_rate) !== rate(initial.tds_rate)) payload.tds_rate = rate(values.tds_rate);
  if (rate(values.default_gst_rate) !== rate(initial.default_gst_rate)) payload.default_gst_rate = rate(values.default_gst_rate);
  if (values.payer_type !== initial.payer_type) payload.payer_type = values.payer_type || null;
  if (values.is_active !== initial.is_active) payload.is_active = values.is_active;
  return payload;
}
