import type { CreateRecurringInput, RecurringFrequency } from '@/hooks/use-recurring-invoices';

export interface LineForm {
  description: string;
  amount: string;
  gstRate: string;
  accountId: string;
}

export interface RecurringForm {
  lines: LineForm[];
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string;
  dueDays: string;
  autoPost: boolean;
}

export const FREQUENCY_LABELS: Readonly<Record<RecurringFrequency, string>> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
  yearly: 'Yearly',
};

export const GST_RATES = ['0', '5', '18', '40'] as const;
export const MAX_LINES = 14;

export const emptyLine = (accountId = ''): LineForm => ({ description: '', amount: '', gstRate: '0', accountId });

export const emptyRecurringForm = (startDate: string, accountId = ''): RecurringForm => ({
  lines: [emptyLine(accountId)],
  frequency: 'monthly',
  startDate,
  endDate: '',
  dueDays: '',
  autoPost: false,
});

const twoDecimals = (value: number): boolean => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

/** The schedule's rules, as the API checks them. */
export function recurringErrors(form: RecurringForm, today: string): Record<string, string> {
  const errors: Record<string, string> = {};
  form.lines.forEach((line, index) => {
    const amount = Number(line.amount);
    if (!line.description.trim()) errors[`line${index}.description`] = 'Describe the line';
    if (!(amount > 0) || !twoDecimals(amount)) errors[`line${index}.amount`] = 'An amount above zero, at most two decimals';
  });
  if (!form.startDate || form.startDate < today) errors.startDate = 'Today or later';
  if (form.endDate && form.endDate < form.startDate) errors.endDate = 'Not before the start';
  const dueDays = Number(form.dueDays);
  if (form.dueDays.trim() && (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 365)) errors.dueDays = '0 to 365 days';
  return errors;
}

export function toRecurringPayload(customerId: string, form: RecurringForm): CreateRecurringInput {
  return {
    customer_id: customerId,
    lines: form.lines.map((line) => ({
      description: line.description.trim(),
      amount: Number(line.amount),
      gst_rate: Number(line.gstRate),
      ...(line.accountId ? { income_account_id: line.accountId } : {}),
    })),
    frequency: form.frequency,
    start_date: form.startDate,
    end_date: form.endDate || null,
    due_days: form.dueDays.trim() ? Number(form.dueDays) : null,
    auto_post: form.autoPost,
  };
}
