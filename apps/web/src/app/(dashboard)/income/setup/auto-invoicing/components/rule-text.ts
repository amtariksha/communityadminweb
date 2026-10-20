import type { RuleLine } from '@/hooks/use-billing-rules';
import { addDays } from '@/lib/date';

const rupees = (value: number, minDecimals: number, maxDecimals: number): string =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: minDecimals, maximumFractionDigits: maxDecimals })}`;

/**
 * The "Rule" column of Setup › Auto Invoicing (INC-S1): the line's non-zero
 * parts, e.g. "₹2.50 / sq.ft 1 + ₹1.00 / sq.ft 2 + ₹200 per unit, per month".
 */
export function ruleText(line: Pick<RuleLine, 'rate_sqft1_month' | 'rate_sqft2_month' | 'unit_fee_month'>): string {
  const parts: string[] = [];
  const rate1 = Number(line.rate_sqft1_month);
  const rate2 = Number(line.rate_sqft2_month);
  const fee = Number(line.unit_fee_month);
  if (rate1 > 0) parts.push(`${rupees(rate1, 2, 4)} / sq.ft 1`);
  if (rate2 > 0) parts.push(`${rupees(rate2, 2, 4)} / sq.ft 2`);
  if (fee > 0) parts.push(`${rupees(fee, Number.isInteger(fee) ? 0 : 2, 2)} per unit`);
  return parts.length === 0 ? '—' : `${parts.join(' + ')}, per month`;
}

/** "18%" when GST applies, else "No". */
export function gstText(line: Pick<RuleLine, 'gst_applicable' | 'gst_rate'>): string {
  return line.gst_applicable ? `${Number(line.gst_rate)}%` : 'No';
}

/** Rates in force from 22-09-2025; 12% and 28% stay for lines that start before it. */
export const GST_REFORM_DATE = '2025-09-22';

export function gstRatesFor(effectiveFrom: string): number[] {
  return effectiveFrom !== '' && effectiveFrom < GST_REFORM_DATE ? [5, 12, 18, 28, 40] : [5, 18, 40];
}

/** The day before a date (YYYY-MM-DD), as the API closes a revised version. */
export function dayBefore(iso: string): string {
  return addDays(iso, -1);
}
