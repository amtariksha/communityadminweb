import type { GenerateInvoicesResult } from '@/hooks';

/** Success-toast text for POST /invoices/generate: "3 created, 2 already billed". */
export function describeGenerateResult(result: GenerateInvoicesResult): string {
  return `${result.count} created, ${result.skipped ?? 0} already billed`;
}
