import { normalizePhone, validateName } from '@/lib/validation';
import type { UpdateMemberInput } from '@/hooks/use-unit-members';

/**
 * Edit Member (UNIT-S7): the form's values, what an edit sends (only the
 * fields that changed) and its checks. Shared by the standard unit dialog,
 * the classic unit panel and the resident record (MOVE-11).
 */

export const MEMBER_TYPE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'owner_family', label: 'Owner Family' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'tenant_family', label: 'Tenant Family' },
] as const;

export const ALTERNATE_ADDRESS_MAX = 500;

export interface MemberFormValues {
  name: string;
  phone: string;
  email: string;
  member_type: string;
  is_primary_contact: boolean;
  lives_here: boolean;
  is_association_member: boolean;
  alternate_address: string;
  lease_end_date: string;
  birthdate: string;
}

export interface MemberFormSource {
  name: string | null;
  phone: string | null;
  email: string | null;
  member_type: string;
  is_primary_contact: boolean;
  lives_here?: boolean | null;
  is_association_member?: boolean;
  alternate_address?: string | null;
  lease_end_date?: string | null;
  birthdate?: string | null;
}

const day = (value: string | null | undefined): string => (value ? value.slice(0, 10) : '');
const isTenantSide = (type: string): boolean => type === 'tenant' || type === 'tenant_family';

/** Lives Here when the API has not said: tenants yes, owners yes (no tenant known here). */
export function memberFormValues(source: MemberFormSource): MemberFormValues {
  return {
    name: source.name ?? '',
    phone: source.phone ?? '',
    email: source.email ?? '',
    member_type: source.member_type,
    is_primary_contact: source.is_primary_contact,
    lives_here: source.lives_here ?? true,
    is_association_member: source.is_association_member ?? false,
    alternate_address: source.alternate_address ?? '',
    lease_end_date: day(source.lease_end_date),
    birthdate: day(source.birthdate),
  };
}

export type MemberFormErrors = Partial<Record<keyof MemberFormValues, string>>;

function checkPhone(values: MemberFormValues): string | undefined {
  const phone = normalizePhone(values.phone);
  if (!phone.ok) return phone.error;
  const needsPhone = values.member_type === 'owner' || values.member_type === 'tenant';
  return needsPhone && !phone.value ? 'Phone is required for an owner or a tenant.' : undefined;
}

export function memberFormErrors(values: MemberFormValues, today = new Date().toISOString().slice(0, 10)): MemberFormErrors {
  const errors: MemberFormErrors = {};
  const name = validateName(values.name);
  if (!name.ok) errors.name = name.error;
  const phone = checkPhone(values);
  if (phone) errors.phone = phone;
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email.';
  if (values.alternate_address.length > ALTERNATE_ADDRESS_MAX) {
    errors.alternate_address = `At most ${ALTERNATE_ADDRESS_MAX} characters.`;
  }
  if (values.birthdate && values.birthdate > today) errors.birthdate = 'Birthdate cannot be in the future.';
  return errors;
}

/** The PATCH body: only what changed (an unchanged phone is never re-sent). */
export function memberChanges(initial: MemberFormValues, values: MemberFormValues): Omit<UpdateMemberInput, 'unitId' | 'memberId'> {
  const changes: Omit<UpdateMemberInput, 'unitId' | 'memberId'> = {};
  if (values.name.trim() !== initial.name.trim()) changes.name = values.name.trim();
  if (values.phone.trim() !== initial.phone.trim()) {
    const phone = normalizePhone(values.phone);
    if (phone.ok && phone.value) changes.phone = phone.value;
  }
  if (values.email.trim() !== initial.email.trim()) changes.email = values.email.trim() || null;
  if (values.member_type !== initial.member_type) changes.member_type = values.member_type;
  if (values.is_primary_contact !== initial.is_primary_contact) changes.is_primary_contact = values.is_primary_contact;
  if (values.lives_here !== initial.lives_here) changes.lives_here = values.lives_here;
  if (values.is_association_member !== initial.is_association_member) changes.is_association_member = values.is_association_member;
  if (values.alternate_address !== initial.alternate_address) changes.alternate_address = values.alternate_address.trim() || null;
  if (values.lease_end_date !== initial.lease_end_date && isTenantSide(values.member_type)) {
    changes.lease_end_date = values.lease_end_date || null;
  }
  if (values.birthdate !== initial.birthdate) changes.birthdate = values.birthdate || null;
  return changes;
}

/** Tags on a member card: type, Primary Contact, Lives Here, Association Member. */
export function memberTags(member: Pick<MemberFormSource, 'is_primary_contact' | 'lives_here' | 'is_association_member'>): string[] {
  return [
    ...(member.is_primary_contact ? ['Primary Contact'] : []),
    ...(member.lives_here ? ['Lives Here'] : []),
    ...(member.is_association_member ? ['Association Member'] : []),
  ];
}
