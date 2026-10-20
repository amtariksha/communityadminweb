import type { FinancialYear, GstThresholdMethod } from '@communityos/shared';

/** How a financial year charges GST above ₹7,500 a month (Income › Setup › GST). */
export const GST_METHOD_LABELS: Record<GstThresholdMethod, string> = {
  excess_only: 'Only on the amount above ₹7,500',
  whole_amount: 'On the whole amount',
};

export const GST_METHODS = Object.keys(GST_METHOD_LABELS) as GstThresholdMethod[];

/** A year's saved method; a server without the setting bills every year on the default. */
export function methodOf(year: Pick<FinancialYear, 'gst_threshold_method'>): GstThresholdMethod {
  return year.gst_threshold_method ?? 'excess_only';
}
