import type { OnboardingEdit } from '@/hooks/use-unapproved-users';
import { normalizePhone, validateName } from '@/lib/validation';

/** The Edit form of Unapproved Users (UNIT-S1) and its checks. */

export interface EditRequestValues {
  name: string;
  phone: string;
  email: string;
  memberType: 'tenant' | 'tenant_family';
}

export type EditRequestErrors = Partial<Record<keyof EditRequestValues, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkEditRequest(values: EditRequestValues): { errors: EditRequestErrors; changes?: OnboardingEdit } {
  const errors: EditRequestErrors = {};
  const name = validateName(values.name);
  if (!name.ok) errors.name = name.error;
  const phone = normalizePhone(values.phone);
  if (!phone.ok) errors.phone = phone.error;
  else if (phone.value === '') errors.phone = 'Phone/Mobile is required.';
  const email = values.email.trim();
  if (email && !EMAIL_RE.test(email)) errors.email = 'Enter a valid email.';
  if (Object.keys(errors).length > 0 || !name.ok || !phone.ok) return { errors };
  return {
    errors,
    changes: {
      tenant_name: name.value,
      tenant_phone: phone.value,
      tenant_email: email || null,
      member_type: values.memberType,
    },
  };
}
