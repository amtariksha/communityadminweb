import type { CategoryInput, CategoryStatus, ViolationCategory } from '@/hooks/use-violations';

/** The Add / Edit Category form's values as typed (RULE-S3). */
export interface CategoryFormValues {
  title: string;
  description: string;
  warning_days: string;
  penalty_days: string;
  penalty_amount: string;
  apply_gst: boolean;
  income_account_id: string;
}

export type CategoryFormErrors = Partial<Record<keyof CategoryFormValues, string>>;

export const EMPTY_CATEGORY: CategoryFormValues = {
  title: '',
  description: '',
  warning_days: '',
  penalty_days: '',
  penalty_amount: '',
  apply_gst: true,
  income_account_id: '',
};

export function valuesFrom(category: ViolationCategory): CategoryFormValues {
  return {
    title: category.title,
    description: category.description ?? '',
    warning_days: String(category.warning_days),
    penalty_days: String(category.penalty_days),
    penalty_amount: String(Number(category.penalty_amount)),
    apply_gst: category.apply_gst,
    income_account_id: category.income_account_id ?? '',
  };
}

function daysError(value: string, label: string): string | undefined {
  if (value.trim() === '') return `Enter ${label}`;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0 || days > 365) return `${label} is a whole number from 0 to 365`;
  return undefined;
}

function amountError(value: string): string | undefined {
  if (value.trim() === '') return 'Enter the penalty amount';
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 'Penalty amount is 0 or more';
  if (Math.round(amount * 100) !== amount * 100) return 'Penalty amount has at most two decimals';
  return undefined;
}

/**
 * Errors for Save as Draft / Save Changes: every required field. Publish
 * (and saving a published category) also needs the charge head when the
 * penalty is above 0.
 */
export function categoryErrors(values: CategoryFormValues, forPublish: boolean): CategoryFormErrors {
  const errors: CategoryFormErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = 'Enter a title';
  else if (title.length > 90) errors.title = 'Title is at most 90 characters';
  if (values.description.length > 2000) errors.description = 'Description is at most 2,000 characters';
  const warning = daysError(values.warning_days, 'Warning — No of Days');
  if (warning) errors.warning_days = warning;
  const penalty = daysError(values.penalty_days, 'Penalty — No of Days');
  if (penalty) errors.penalty_days = penalty;
  const amount = amountError(values.penalty_amount);
  if (amount) errors.penalty_amount = amount;
  if (forPublish && !amount && Number(values.penalty_amount) > 0 && !values.income_account_id) {
    errors.income_account_id = 'Pick the penalty charge head';
  }
  return errors;
}

export function toInput(values: CategoryFormValues): CategoryInput {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    warning_days: Number(values.warning_days),
    penalty_days: Number(values.penalty_days),
    penalty_amount: Number(values.penalty_amount),
    apply_gst: values.apply_gst,
    income_account_id: values.income_account_id || null,
  };
}

/** The page's two buttons by status: the save and the status change. */
export function formActions(status: CategoryStatus | undefined): { save: string; toggle: 'publish' | 'unpublish' } {
  if (status === 'published') return { save: 'Save Changes', toggle: 'unpublish' };
  if (status === 'inactive') return { save: 'Save Changes', toggle: 'publish' };
  return { save: 'Save as Draft', toggle: 'publish' };
}

export const STATUS_LABELS: Readonly<Record<CategoryStatus, string>> = {
  draft: 'Draft',
  published: 'Published',
  inactive: 'Inactive',
};
