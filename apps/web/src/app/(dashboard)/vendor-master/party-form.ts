import type { Customer } from '@communityos/shared';

/**
 * Add / Edit a non-member-income party (VEND-S2 opened from Vendors for
 * Non Member Income, VEND-07): the vendor form without Account Head, GST
 * rates and Vendor type, saved to `customers`. Pure, tested on its own.
 */
export type Party = Customer & {
  party_code?: string | null;
  tds_rate?: string | number | null;
  tds_section?: string | null;
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
}>;

type TextField = Exclude<keyof PartyFormValues, 'name' | 'tds_rate' | 'is_active'>;

const TEXT_FIELDS: readonly TextField[] = [
  'party_code', 'contact_person', 'phone', 'email', 'address', 'gstin', 'pan', 'tds_section', 'notes',
  'bank_name', 'bank_branch', 'bank_account_number', 'bank_ifsc',
];

export function emptyPartyForm(): PartyFormValues {
  return {
    party_code: '', name: '', contact_person: '', phone: '', email: '', address: '', gstin: '', pan: '',
    tds_section: '', tds_rate: '', notes: '', bank_name: '', bank_branch: '', bank_account_number: '', bank_ifsc: '',
    is_active: true,
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
  return null;
}

/** Add: every field, blanks as null. */
export function createPartyPayload(values: PartyFormValues): PartyPayload {
  const payload: PartyPayload = { name: values.name.trim(), tds_rate: rate(values.tds_rate) };
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
  if (values.is_active !== initial.is_active) payload.is_active = values.is_active;
  return payload;
}
