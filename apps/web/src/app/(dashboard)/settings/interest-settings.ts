import type { TenantSettings } from '@communityos/shared';

export type BillingInterestSetting = NonNullable<TenantSettings['billing_interest']>;

/** The four fields of the Late payment interest card, held as form text. */
export interface InterestForm {
  rate_pa: string;
  due_days: string;
  basis: 'due_date' | 'invoice_date';
  start_date: string;
}

export const DEFAULT_INTEREST: InterestForm = {
  rate_pa: '18',
  due_days: '10',
  basis: 'due_date',
  start_date: '',
};

export function readInterestSettings(saved: unknown): InterestForm {
  const value = (saved ?? {}) as Record<string, unknown>;
  const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  return {
    rate_pa: isNumber(value.rate_pa) ? String(value.rate_pa) : DEFAULT_INTEREST.rate_pa,
    due_days: isNumber(value.due_days) ? String(value.due_days) : DEFAULT_INTEREST.due_days,
    basis: value.basis === 'invoice_date' ? 'invoice_date' : 'due_date',
    start_date: typeof value.start_date === 'string' ? value.start_date : '',
  };
}

export type InterestErrors = Partial<Record<'rate_pa' | 'due_days', string>>;

export function interestErrors(form: InterestForm): InterestErrors {
  const errors: InterestErrors = {};
  const rate = Number(form.rate_pa);
  if (form.rate_pa.trim() === '' || !Number.isFinite(rate) || rate < 0 || rate > 36) {
    errors.rate_pa = 'Enter a rate from 0 to 36.';
  } else if (Math.abs(rate * 100 - Math.round(rate * 100)) > 1e-6) {
    errors.rate_pa = 'Use at most two decimals.';
  }
  const days = Number(form.due_days);
  if (form.due_days.trim() === '' || !Number.isInteger(days) || days < 0 || days > 365) {
    errors.due_days = 'Enter whole days from 0 to 365.';
  }
  return errors;
}

/**
 * The object PATCH /tenants/:id/settings stores under billing_interest. The save
 * replaces the whole key, so the fields this form does not edit (HSN/SAC, the
 * interest income account, auto-post) are carried over from what is saved.
 */
export function toInterestPayload(
  form: InterestForm,
  saved: Partial<BillingInterestSetting> | undefined,
): BillingInterestSetting {
  return {
    ...(saved ?? {}),
    rate_pa: Number(form.rate_pa),
    due_days: Number(form.due_days),
    basis: form.basis,
    start_date: form.start_date === '' ? null : form.start_date,
  };
}

export function sameInterest(a: InterestForm, b: InterestForm): boolean {
  return (
    Number(a.rate_pa) === Number(b.rate_pa) &&
    Number(a.due_days) === Number(b.due_days) &&
    a.basis === b.basis &&
    a.start_date === b.start_date
  );
}
