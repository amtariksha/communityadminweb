import type { SkippedMeter } from '@/hooks/use-utilities';

/**
 * The toast after Calculate Bills (UTIL-02): how many bills were made and
 * which meters were skipped, with the server's reason for each.
 */
export interface CalculateBillsResult {
  count: number;
  /** Absent from an API older than UTIL-02. */
  skipped?: SkippedMeter[];
}

const LISTED = 5;

export function calculateBillsSummary(result: CalculateBillsResult): { title: string; description?: string } {
  const title = `${result.count} ${result.count === 1 ? 'bill' : 'bills'} calculated`;
  const skipped = result.skipped ?? [];
  if (skipped.length === 0) return { title };
  const listed = skipped.slice(0, LISTED).map((meter) => `${meter.meter_number} (${meter.reason})`);
  const more = skipped.length > LISTED ? `, and ${skipped.length - LISTED} more` : '';
  return { title, description: `${skipped.length} skipped: ${listed.join(', ')}${more}.` };
}
