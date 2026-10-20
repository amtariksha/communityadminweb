import type { MeterRule, MeterRuleInput, MeterType } from '@/hooks/use-meter-rules';

/** The ten-slab rule form (UTIL-S2) as typed. Blank rows are ignored. */
export const SLAB_ROWS = 10;

export interface RuleForm {
  meterType: MeterType;
  ledgerAccountId: string;
  memorize: boolean;
  cumulative: boolean;
  minimumCharge: string;
  effectiveFrom: string;
  slabs: Array<{ upto: string; rate: string }>;
}

export type RuleFormErrors = Partial<Record<string, string>>;

const blankSlabs = (): RuleForm['slabs'] => Array.from({ length: SLAB_ROWS }, () => ({ upto: '', rate: '' }));

export function emptyRuleForm(meterType: MeterType, today: string): RuleForm {
  return { meterType, ledgerAccountId: '', memorize: true, cumulative: false, minimumCharge: '0', effectiveFrom: today, slabs: blankSlabs() };
}

const plain = (value: string): string => String(Number(value));

/** A saved rule as the form to revise it from `effectiveFrom`. */
export function formFromRule(rule: MeterRule, effectiveFrom: string): RuleForm {
  const slabs = blankSlabs();
  rule.slabs.forEach((slab, index) => {
    if (index < SLAB_ROWS) slabs[index] = { upto: slab.slab_to === null ? '' : plain(slab.slab_to), rate: plain(slab.rate_per_unit) };
  });
  return {
    meterType: rule.meter_type,
    ledgerAccountId: rule.ledger_account_id ?? '',
    memorize: rule.memorize_readings,
    cumulative: rule.cumulative_slab,
    minimumCharge: plain(rule.minimum_charge),
    effectiveFrom,
    slabs,
  };
}

const MONEY = /^\d+(\.\d{1,2})?$/;

/** The rows the user filled: up to the last row with a rate. */
function usedRows(form: RuleForm): RuleForm['slabs'] {
  let last = -1;
  form.slabs.forEach((row, index) => {
    if (row.rate.trim() !== '' || row.upto.trim() !== '') last = index;
  });
  return form.slabs.slice(0, last + 1);
}

function slabErrors(rows: RuleForm['slabs'], errors: RuleFormErrors): void {
  let previous = 0;
  rows.forEach((row, index) => {
    const n = index + 1;
    if (!MONEY.test(row.rate.trim())) errors[`slabs.${index}.rate`] = `Slab ${n} needs a rate (₹, two decimals at most).`;
    const upto = row.upto.trim();
    if (upto === '') {
      if (index < rows.length - 1) errors[`slabs.${index}.upto`] = `Slab ${n} needs its units: only the last slab may be open-ended.`;
      return;
    }
    if (!MONEY.test(upto) || Number(upto) <= previous) {
      errors[`slabs.${index}.upto`] = index === 0 ? 'Slab 1 must be above 0.' : `Slab ${n} must be above slab ${index}.`;
    }
    previous = Number(upto);
  });
}

export function ruleFormErrors(form: RuleForm, minimumFrom?: string): RuleFormErrors {
  const errors: RuleFormErrors = {};
  if (!form.ledgerAccountId) errors.ledgerAccountId = 'Pick the income account.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.effectiveFrom)) errors.effectiveFrom = 'Pick the date it takes effect.';
  else if (minimumFrom && form.effectiveFrom <= minimumFrom) errors.effectiveFrom = `Pick a date after ${minimumFrom}.`;
  if (!MONEY.test(form.minimumCharge.trim())) errors.minimumCharge = 'Enter an amount (two decimals at most).';
  const rows = usedRows(form);
  if (rows.length === 0) errors['slabs.0.rate'] = 'Fill slab 1.';
  slabErrors(rows, errors);
  return errors;
}

export function toRuleInput(form: RuleForm): MeterRuleInput {
  return {
    ledger_account_id: form.ledgerAccountId,
    memorize_readings: form.memorize,
    cumulative_slab: form.cumulative,
    minimum_charge: Number(form.minimumCharge),
    effective_from: form.effectiveFrom,
    slabs: usedRows(form).map((row) => ({ upto: row.upto.trim() === '' ? null : Number(row.upto), rate: Number(row.rate) })),
  };
}

/** "0 – 10", "20 and above". */
export function slabRange(slab: { slab_from: string; slab_to: string | null }): string {
  return slab.slab_to === null ? `${plain(slab.slab_from)} and above` : `${plain(slab.slab_from)} – ${plain(slab.slab_to)}`;
}

/** The day after `iso` (YYYY-MM-DD). */
export function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** A revision starts today, or the day after the version it replaces when that starts later. */
export function firstRevisionDay(rule: Pick<MeterRule, 'effective_from'>, today: string): string {
  return today > rule.effective_from ? today : nextDay(rule.effective_from);
}

