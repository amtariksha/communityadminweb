/**
 * Reading a billing rule row. The API returns `gst_rule` and
 * `gst_percentage` (DECIMAL, so a string); the older field names
 * `is_gst_applicable` and `gst_rate` are kept as a fallback.
 */
interface RuleGstFields {
  gst_rule?: string | null;
  gst_percentage?: number | string | null;
  is_gst_applicable?: boolean;
  gst_rate?: number | string | null;
}

export function ruleGst(rule: RuleGstFields): { applies: boolean; rate: number } {
  if (rule.gst_rule !== undefined && rule.gst_rule !== null) {
    if (rule.gst_rule === 'none') return { applies: false, rate: 0 };
    return { applies: true, rate: Number(rule.gst_percentage ?? 0) };
  }
  if (rule.is_gst_applicable) {
    return { applies: true, rate: Number(rule.gst_rate ?? 0) };
  }
  return { applies: false, rate: 0 };
}

export function ruleGstLabel(rule: RuleGstFields): string {
  const { applies, rate } = ruleGst(rule);
  return applies ? `${rate}%` : 'N/A';
}

/** The rules invoices can be generated from. */
export function activeRules<T extends { is_active?: boolean }>(rules: readonly T[]): T[] {
  return rules.filter((rule) => rule.is_active !== false);
}
