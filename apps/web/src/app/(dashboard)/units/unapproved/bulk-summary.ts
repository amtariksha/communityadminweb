import type { BulkApprovalResult } from '@/hooks/use-unapproved-users';

/** "3 approved, 1 skipped — waiting for unit owner" (UNIT-S1). */
export function bulkSummary(results: readonly BulkApprovalResult[]): string {
  const count = (status: BulkApprovalResult['status']) => results.filter((result) => result.status === status).length;
  const parts: string[] = [];
  const approved = count('approved');
  const advanced = count('advanced');
  const skipped = results.filter((result) => result.status === 'skipped');
  const failed = count('error');
  if (approved > 0) parts.push(`${approved} approved`);
  if (advanced > 0) parts.push(`${advanced} moved to the next level`);
  if (skipped.length > 0) {
    const reasons = Array.from(new Set(skipped.map((result) => result.message.toLowerCase())));
    parts.push(`${skipped.length} skipped — ${reasons.join(', ')}`);
  }
  if (failed > 0) parts.push(`${failed} not approved (see the rows)`);
  return parts.join(', ') || 'Nothing was approved.';
}
