import type { CatalogueParam } from '@/hooks/use-reports';
import { currentFinancialYear } from '@/lib/date';

/**
 * The run page's options (REP-S2): one value per parameter, then the
 * request body the API validates. A date range is either one of the
 * period presets or a picked From / To.
 */

export interface RangeValue {
  preset: string;
  from: string;
  to: string;
}

export type ParamValue = string | number | boolean | RangeValue;

export const CUSTOM_RANGE = 'selected_period';

function initialValue(param: CatalogueParam, today: string): ParamValue {
  const fallback = typeof param.default === 'string' ? param.default : '';
  switch (param.type) {
    case 'date_range': {
      const year = currentFinancialYear(today);
      const preset = typeof param.default === 'string' ? param.default : CUSTOM_RANGE;
      return { preset, from: year.start_date, to: year.end_date };
    }
    case 'as_of_date':
    case 'date':
      return fallback === 'as_of_today' || !fallback ? today : fallback;
    case 'period_preset':
    case 'select':
      return fallback || param.options?.[0]?.value || '';
    case 'boolean':
      return param.default === true;
    case 'number':
      return typeof param.default === 'number' ? param.default : '';
    default:
      return fallback;
  }
}

export function initialValues(params: readonly CatalogueParam[], today: string): Record<string, ParamValue> {
  return Object.fromEntries(params.map((param) => [param.key, initialValue(param, today)]));
}

function requestValue(param: CatalogueParam, value: ParamValue): unknown {
  if (param.type === 'date_range') {
    const range = value as RangeValue;
    if (range.preset !== CUSTOM_RANGE) return range.preset;
    return range.from && range.to ? { from: range.from, to: range.to } : undefined;
  }
  if (param.type === 'number') return value === '' ? undefined : Number(value);
  if (param.type === 'boolean') return value === true;
  return value === '' ? undefined : value;
}

/** The body's `params`, or the message to show when a required option is missing. */
export function requestParams(
  params: readonly CatalogueParam[],
  values: Readonly<Record<string, ParamValue>>,
): { params: Record<string, unknown> } | { error: string } {
  const body: Record<string, unknown> = {};
  for (const param of params) {
    const value = requestValue(param, values[param.key] ?? '');
    if (value === undefined) {
      if (param.required) return { error: `Choose ${param.label.toLowerCase()}.` };
      continue;
    }
    body[param.key] = value;
  }
  return { params: body };
}

/** Financial years offered by a financial-year option: current, previous and the four before. */
export function financialYearOptions(today: string): Array<{ value: string; label: string }> {
  const start = Number(currentFinancialYear(today).start_date.slice(0, 4));
  const years = Array.from({ length: 6 }, (_, index) => start - index);
  return years.map((year) => ({ value: String(year), label: `FY ${year}-${String((year + 1) % 100).padStart(2, '0')}` }));
}
