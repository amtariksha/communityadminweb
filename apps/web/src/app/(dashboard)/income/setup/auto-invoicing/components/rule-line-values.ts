import type { RuleLine, RuleLineFees } from '@/hooks/use-billing-rules';

/** The Add / Edit Line Item form as typed (strings, so a blank box stays blank). */
export interface RuleLineFormValues {
  ledger_account_id: string;
  rate_sqft1_month: string;
  rate_sqft2_month: string;
  unit_fee_month: string;
  gst_applicable: boolean;
  gst_rate: string;
  interest_applicable: boolean;
  hsn_update: boolean;
  hsn_sac: string;
  effective_from: string;
}

export type RuleLineFormErrors = Partial<Record<keyof RuleLineFormValues, string>>;

const asText = (value: string): string => (Number(value) === 0 ? '' : String(Number(value)));

export function initialValues(line?: RuleLine): RuleLineFormValues {
  return {
    ledger_account_id: line?.ledger_account_id ?? '',
    rate_sqft1_month: line ? asText(line.rate_sqft1_month) : '',
    rate_sqft2_month: line ? asText(line.rate_sqft2_month) : '',
    unit_fee_month: line ? asText(line.unit_fee_month) : '',
    gst_applicable: line?.gst_applicable ?? false,
    gst_rate: line ? String(Number(line.gst_rate)) : '18',
    interest_applicable: line?.interest_applicable ?? true,
    hsn_update: Boolean(line?.hsn_sac),
    hsn_sac: line?.hsn_sac ?? '',
    // A revision needs a new date after the current one.
    effective_from: '',
  };
}

const decimals = (value: string): number => (value.includes('.') ? value.split('.')[1].length : 0);

function feeError(value: string, maxDecimals: number): string | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 'Enter 0 or more.';
  if (decimals(value.trim()) > maxDecimals) return `At most ${maxDecimals} decimals.`;
  return undefined;
}

/** Field errors before anything is sent; `after` is the date a revision must follow. */
export function validateRuleLine(values: RuleLineFormValues, opts: { revising: boolean; after?: string }): RuleLineFormErrors {
  const errors: RuleLineFormErrors = {};
  if (!opts.revising && !values.ledger_account_id) errors.ledger_account_id = 'Pick an income account.';
  const fee1 = feeError(values.rate_sqft1_month, 4);
  const fee2 = feeError(values.rate_sqft2_month, 4);
  const fee = feeError(values.unit_fee_month, 2);
  if (fee1) errors.rate_sqft1_month = fee1;
  if (fee2) errors.rate_sqft2_month = fee2;
  if (fee) errors.unit_fee_month = fee;
  const total = [values.rate_sqft1_month, values.rate_sqft2_month, values.unit_fee_month].some((v) => Number(v) > 0);
  if (!fee1 && !fee2 && !fee && !total) errors.unit_fee_month = 'Enter at least one fee above 0.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.effective_from)) errors.effective_from = 'Pick the date this line applies from.';
  else if (opts.after && values.effective_from <= opts.after) errors.effective_from = `Pick a date after ${opts.after}.`;
  if (values.hsn_update && !/^\d{4,8}$/.test(values.hsn_sac)) errors.hsn_sac = 'HSN/SAC is 4 to 8 digits.';
  return errors;
}

export function toFees(values: RuleLineFormValues): RuleLineFees {
  return {
    rate_sqft1_month: Number(values.rate_sqft1_month || 0),
    rate_sqft2_month: Number(values.rate_sqft2_month || 0),
    unit_fee_month: Number(values.unit_fee_month || 0),
    gst_applicable: values.gst_applicable,
    gst_rate: Number(values.gst_rate),
    interest_applicable: values.interest_applicable,
    hsn_sac: values.hsn_update && values.hsn_sac ? values.hsn_sac : null,
    effective_from: values.effective_from,
  };
}
