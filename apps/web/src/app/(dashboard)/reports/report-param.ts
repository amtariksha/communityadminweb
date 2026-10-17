export type ReportId =
  | 'trial-balance'
  | 'balance-sheet'
  | 'income-expenditure'
  | 'general-ledger'
  | 'defaulters'
  | 'vendor-aging';

const REPORT_IDS: readonly ReportId[] = [
  'trial-balance',
  'balance-sheet',
  'income-expenditure',
  'general-ledger',
  'defaulters',
  'vendor-aging',
];

/** The report named by `?report=`, or null when the value is missing or not a report. */
export function reportFromParam(value: string | null): ReportId | null {
  return REPORT_IDS.find((id) => id === value) ?? null;
}
