import { formatCurrency } from '@/lib/utils';

// Money arrives from the API as NUMERIC strings; sums are worked in paise.
function toPaise(value: number | string): number {
  return Math.round(Number(value) * 100);
}

export interface ReceiptAllocationSummary {
  allocated: number;
  invoiceCount: number;
  advance: number;
}

/**
 * Where a recorded receipt's money went. An API that ignores
 * `allocation_mode` returns no allocations, which reads correctly as
 * "all held as advance".
 */
export function summarizeReceiptAllocation(
  amount: number,
  allocations: ReadonlyArray<{ invoice_id: string; amount: number | string }> | undefined,
): ReceiptAllocationSummary {
  const rows = allocations ?? [];
  const allocatedPaise = rows.reduce((sum, row) => sum + toPaise(row.amount), 0);
  return {
    allocated: allocatedPaise / 100,
    invoiceCount: new Set(rows.map((row) => row.invoice_id)).size,
    advance: Math.max(0, toPaise(amount) - allocatedPaise) / 100,
  };
}

export function describeReceiptAllocation(summary: ReceiptAllocationSummary): string {
  const invoices = summary.invoiceCount === 1 ? 'invoice' : 'invoices';
  return (
    `Allocated ${formatCurrency(summary.allocated)} to ${summary.invoiceCount} ${invoices}; ` +
    `${formatCurrency(summary.advance)} held as advance`
  );
}

/** Units holding an unapplied advance, and how much they hold in all. */
export function summarizeAdvances(
  advances: ReadonlyArray<{ unit_id: string; remaining: number | string }>,
): { unitCount: number; total: number } {
  const open = advances.filter((advance) => toPaise(advance.remaining) > 0);
  const totalPaise = open.reduce((sum, advance) => sum + toPaise(advance.remaining), 0);
  return {
    unitCount: new Set(open.map((advance) => advance.unit_id)).size,
    total: totalPaise / 100,
  };
}
