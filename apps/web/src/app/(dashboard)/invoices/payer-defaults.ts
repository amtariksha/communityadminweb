/**
 * INC-46 — a new non-member invoice starts with the payer's Account Head,
 * GST rate and TDS rate (Add Payer, INC-S33). Each fills only what the
 * operator has not chosen yet.
 */
export interface PayerDefaultsSource {
  default_income_account_id?: string | null;
  default_gst_rate?: string | number | null;
  tds_rate?: string | number | null;
}

export interface PayerInvoiceDefaults {
  incomeAccountId: string;
  gstRate: string;
  tdsRate: string;
}

const rateText = (value: string | number | null | undefined): string => (value == null || value === '' ? '' : String(Number(value)));

export function payerInvoiceDefaults(payer: PayerDefaultsSource): PayerInvoiceDefaults {
  return {
    incomeAccountId: payer.default_income_account_id ?? '',
    gstRate: rateText(payer.default_gst_rate),
    tdsRate: rateText(payer.tds_rate),
  };
}

/** Lines with no GST rate picked take the payer's. */
export function linesWithPayerGst<Line extends { gst_rate: string }>(lines: readonly Line[], gstRate: string): Line[] {
  if (!gstRate) return [...lines];
  return lines.map((line) => (line.gst_rate === '' ? { ...line, gst_rate: gstRate } : line));
}

/** The header field keeps what was typed; an empty one takes the default. */
export const orDefault = (current: string, fallback: string): string => (current.trim() === '' ? fallback : current);
