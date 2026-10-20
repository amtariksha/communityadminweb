import type { InvoiceBatchResult } from '@/hooks/use-utility-batch';

/** How many bills a batch left out, by reason. */
export function skippedByReason(result: InvoiceBatchResult): Array<{ reason: string; count: number }> {
  const counts = new Map<string, number>();
  for (const skip of result.skipped) counts.set(skip.reason, (counts.get(skip.reason) ?? 0) + 1);
  return [...counts].map(([reason, count]) => ({ reason, count }));
}
