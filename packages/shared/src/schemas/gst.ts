import { z } from 'zod';

/**
 * GST rates a society may put on a purchase request or vendor invoice line
 * (`settings_json.gst_rate_options`). Unset = the rates in force from
 * 22-09-2025: 0, 5, 18 and 40%. The old 12% and 28% stay accepted on
 * documents dated before that day.
 */
export const DEFAULT_GST_RATE_OPTIONS: readonly number[] = [0, 5, 18, 40];
export const PRE_REFORM_GST_RATES: readonly number[] = [12, 28];
/** First day of the 0 / 5 / 18 / 40 rate structure (YYYY-MM-DD). */
export const GST_RATE_REFORM_DATE = '2025-09-22';

export const gstRateOptionsSchema = z
  .array(
    z
      .number()
      .min(0, 'A GST rate cannot be negative')
      .max(40, 'A GST rate cannot exceed 40%')
      .multipleOf(0.01, 'A GST rate has at most two decimals'),
  )
  .min(1, 'Keep at least one GST rate')
  .max(20, 'At most 20 GST rates');

/** How a line is taxed: CGST + SGST (same state), IGST (other state) or none. */
export const GST_TYPES = ['cgst_sgst', 'igst', 'none'] as const;
export type GstType = (typeof GST_TYPES)[number];

/** HSN (goods) or SAC (services): 4, 6 or 8 digits. */
export const HSN_SAC_PATTERN = /^\d{4}(\d{2}){0,2}$/;
export const HSN_SAC_MESSAGE = 'HSN/SAC must be 4, 6 or 8 digits';
