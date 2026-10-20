import type { AmcContractDetail, AmcContractInput, AmcFrequency } from '@/hooks/use-amc-contracts';
import { addDays } from '@/lib/date';

/**
 * Create Contract / Edit / Renew (VEND-S8, VEND-11): the values as typed,
 * the body sent, the checks before a save and a renewal's dates.
 */
export interface AmcFormValues {
  title: string;
  vendorId: string;
  vendorName: string;
  categoryId: string;
  assetIds: string[];
  startDate: string;
  endDate: string;
  keyTerms: string;
  cost: string;
  reminderDays: string;
  paymentFrequency: '' | AmcFrequency;
  paymentStart: string;
  serviceFrequency: '' | AmcFrequency;
  serviceStart: string;
}

/** VEND-S8's order: Monthly · Quarterly · Yearly · Half Yearly. */
export const AMC_FREQUENCY_OPTIONS: ReadonlyArray<{ value: AmcFrequency; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'half_yearly', label: 'Half Yearly' },
];

export function frequencyWord(value: string | null | undefined): string {
  return AMC_FREQUENCY_OPTIONS.find((option) => option.value === value)?.label ?? '—';
}

const day = (value: string | null | undefined): string => (value ? value.slice(0, 10) : '');

export function emptyAmcForm(): AmcFormValues {
  return {
    title: '', vendorId: '', vendorName: '', categoryId: '', assetIds: [], startDate: '', endDate: '', keyTerms: '', cost: '',
    reminderDays: '30', paymentFrequency: '', paymentStart: '', serviceFrequency: '', serviceStart: '',
  };
}

export function amcFormValues(contract?: AmcContractDetail | null): AmcFormValues {
  if (!contract) return emptyAmcForm();
  return {
    title: contract.title ?? '',
    vendorId: contract.vendor_id ?? '',
    vendorName: contract.vendor_name,
    categoryId: contract.asset_category_id ?? '',
    assetIds: contract.assets?.map((asset) => asset.id) ?? (contract.asset_id ? [contract.asset_id] : []),
    startDate: day(contract.start_date),
    endDate: day(contract.end_date),
    keyTerms: contract.coverage_details ?? '',
    cost: contract.cost === null || contract.cost === undefined ? '' : String(Number(contract.cost)),
    reminderDays: String(contract.reminder_days ?? 30),
    paymentFrequency: contract.payment_frequency ?? '',
    paymentStart: day(contract.payment_start_date),
    serviceFrequency: contract.service_frequency ?? '',
    serviceStart: day(contract.service_start_date),
  };
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** `months` later on the same day of the month, or the month's last day (as the API's schedule). */
function addMonths(iso: string, months: number): string {
  const [year, month, dayOfMonth] = iso.split('-').map(Number);
  const index = year * 12 + month - 1 + months;
  const lastDay = new Date(Date.UTC(Math.floor(index / 12), (index % 12) + 1, 0)).getUTCDate();
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, '0')}`;
}

/** Renew: start the day after the old end, for the same length (whole months stay whole months). */
export function renewalDates(start: string, end: string): { start: string; end: string } {
  const newStart = addDays(end, 1);
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  const months = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  if (months > 0 && addDays(addMonths(start, months), -1) === end) {
    return { start: newStart, end: addDays(addMonths(newStart, months), -1) };
  }
  return { start: newStart, end: addDays(newStart, daysBetween(start, end)) };
}

/** The renewal's form: the old contract's fields with its dates (and schedule starts) moved to the next period. */
export function renewalValues(contract: AmcContractDetail): AmcFormValues {
  const old = amcFormValues(contract);
  const dates = renewalDates(old.startDate, old.endDate);
  const shift = (value: string): string => (value ? addDays(value, daysBetween(old.startDate, dates.start)) : '');
  return { ...old, startDate: dates.start, endDate: dates.end, paymentStart: shift(old.paymentStart), serviceStart: shift(old.serviceStart) };
}

/** What is wrong, or null (the API checks the same). */
export function amcFormError(values: AmcFormValues): string | null {
  const title = values.title.trim();
  if (title.length < 3 || title.length > 255) return 'The contract title is 3 to 255 characters.';
  if (!values.vendorId) return 'Choose the vendor.';
  if (!values.startDate || !values.endDate) return 'Give the contract start and end dates.';
  if (values.endDate <= values.startDate) return 'End date must be after the start date';
  if (values.cost && !(Number(values.cost) >= 0)) return 'The cost must be zero or more.';
  const reminder = Number(values.reminderDays);
  if (!(Number.isInteger(reminder) && reminder >= 1 && reminder <= 365)) return 'Reminder days are 1 to 365.';
  for (const [label, frequency, start] of [['payment', values.paymentFrequency, values.paymentStart], ['service', values.serviceFrequency, values.serviceStart]] as const) {
    if (!frequency) continue;
    if (!start) return `Give the starting date for the ${label} instalments.`;
    if (start < values.startDate || start > values.endDate) return `The ${label} instalments start within the contract dates.`;
  }
  return null;
}

export function amcPayload(values: AmcFormValues): AmcContractInput {
  return {
    title: values.title.trim(),
    vendor_id: values.vendorId,
    vendor_name: values.vendorName || undefined,
    asset_category_id: values.categoryId || null,
    asset_ids: values.assetIds,
    asset_id: values.assetIds[0],
    start_date: values.startDate,
    end_date: values.endDate,
    coverage_details: values.keyTerms.trim() || null,
    cost: values.cost === '' ? null : Number(values.cost),
    reminder_days: Number(values.reminderDays),
    payment_frequency: values.paymentFrequency || null,
    payment_start_date: values.paymentFrequency ? values.paymentStart : null,
    service_frequency: values.serviceFrequency || null,
    service_start_date: values.serviceFrequency ? values.serviceStart : null,
  };
}
