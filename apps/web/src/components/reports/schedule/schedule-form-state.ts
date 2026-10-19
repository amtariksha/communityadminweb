import type { CatalogueParam, CatalogueRow, ReportSchedule, ScheduleFrequency, ScheduleInput } from '@/hooks/use-reports';
import { initialValues, requestParams, type ParamValue } from '../run/report-param-state';

/**
 * The Schedule Report form (REP-S3). Period options stay relative on a
 * schedule (a preset, resolved on every run date); the others are the run
 * page's widgets.
 */

export const PERIOD_TYPES = new Set(['date_range', 'period_preset', 'as_of_date', 'financial_year']);

export const SCHEDULE_ROLES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'community_admin', label: 'Community admin' },
  { value: 'committee_member', label: 'Committee member' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'facility_supervisor', label: 'Facility supervisor' },
  { value: 'security_supervisor', label: 'Security supervisor' },
  { value: 'moderator', label: 'Moderator' },
];

export const DEFAULT_RECIPIENT_ROLES = ['community_admin', 'committee_member'];
const MAX_EMAILS = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ScheduleFormValues {
  frequency: ScheduleFrequency;
  day_of_week: number;
  day_of_month: number;
  month_of_quarter: number;
  time_of_day: string;
  /** Period-like options, as presets. */
  periods: Record<string, string>;
  /** Every other option, as on the run page. */
  options: Record<string, ParamValue>;
  format: 'pdf' | 'xlsx' | 'csv';
  deliver_email: boolean;
  recipient_roles: string[];
  recipient_emails: string;
  is_active: boolean;
}

/** The preset a frequency suggests for a period option (REP-S3 defaults). */
export function defaultPeriod(param: CatalogueParam, frequency: ScheduleFrequency): string {
  if (param.type === 'financial_year') return 'current_fy';
  if (param.type === 'as_of_date') return frequency === 'daily' || frequency === 'weekly' ? 'as_of_today' : 'previous_month';
  if (frequency === 'quarterly') return 'quarter_1';
  return frequency === 'monthly' ? 'previous_month' : 'current_month';
}

export function periodParams(row: CatalogueRow): CatalogueParam[] {
  return row.params.filter((param) => PERIOD_TYPES.has(param.type));
}

export function otherParams(row: CatalogueRow): CatalogueParam[] {
  return row.params.filter((param) => !PERIOD_TYPES.has(param.type));
}

export function initialForm(row: CatalogueRow, today: string, schedule?: ReportSchedule): ScheduleFormValues {
  const frequency = schedule?.frequency ?? 'monthly';
  const periods = Object.fromEntries(
    periodParams(row).map((param) => [param.key, String(schedule?.params[param.key] ?? defaultPeriod(param, frequency))]),
  );
  const options = { ...initialValues(otherParams(row), today), ...(schedule ? (schedule.params as Record<string, ParamValue>) : {}) };
  return {
    frequency,
    day_of_week: schedule?.day_of_week ?? 1,
    day_of_month: schedule?.day_of_month ?? 1,
    month_of_quarter: schedule?.month_of_quarter ?? 1,
    time_of_day: schedule?.time_of_day ?? '09:00',
    periods,
    options: Object.fromEntries(otherParams(row).map((param) => [param.key, options[param.key]])),
    format: schedule?.format ?? 'pdf',
    deliver_email: schedule?.deliver_email ?? true,
    recipient_roles: schedule?.recipient_roles ?? DEFAULT_RECIPIENT_ROLES,
    recipient_emails: (schedule?.recipient_emails ?? []).join(', '),
    is_active: schedule?.is_active ?? true,
  };
}

function emailsOf(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

/** The request body, or the first problem to show. */
export function scheduleBody(
  row: CatalogueRow,
  values: ScheduleFormValues,
): { body: Partial<ScheduleInput> & { report_key: string } } | { error: string } {
  const options = requestParams(otherParams(row), values.options);
  if ('error' in options) return options;
  const emails = emailsOf(values.recipient_emails);
  if (emails.length > MAX_EMAILS) return { error: `At most ${MAX_EMAILS} e-mail addresses.` };
  const wrong = emails.find((email) => !EMAIL.test(email));
  if (wrong) return { error: `"${wrong}" is not an e-mail address.` };
  if (values.deliver_email && values.recipient_roles.length === 0 && emails.length === 0) {
    return { error: 'Choose who receives the e-mail.' };
  }
  if (!values.deliver_email) return { error: 'Send it by e-mail (posting to the notice board comes later).' };
  return {
    body: {
      report_key: row.key,
      params: { ...values.periods, ...options.params },
      frequency: values.frequency,
      day_of_week: values.frequency === 'weekly' ? values.day_of_week : null,
      day_of_month: values.frequency === 'monthly' || values.frequency === 'quarterly' ? values.day_of_month : null,
      month_of_quarter: values.frequency === 'quarterly' ? values.month_of_quarter : null,
      time_of_day: values.time_of_day,
      format: values.format,
      deliver_email: values.deliver_email,
      recipient_roles: values.recipient_roles,
      recipient_emails: emails,
      is_active: values.is_active,
    },
  };
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ORDINAL = ['1st', '2nd', '3rd'];

/** "Monthly on day 3 at 08:00". */
export function frequencyText(schedule: Pick<ReportSchedule, 'frequency' | 'day_of_week' | 'day_of_month' | 'month_of_quarter' | 'time_of_day'>): string {
  const at = `at ${schedule.time_of_day}`;
  switch (schedule.frequency) {
    case 'daily':
      return `Daily ${at}`;
    case 'weekly':
      return `Weekly on ${WEEKDAYS[(schedule.day_of_week ?? 1) - 1]} ${at}`;
    case 'monthly':
      return `Monthly on day ${schedule.day_of_month} ${at}`;
    case 'quarterly':
      return `Quarterly, ${ORDINAL[(schedule.month_of_quarter ?? 1) - 1]} month, day ${schedule.day_of_month} ${at}`;
  }
}
