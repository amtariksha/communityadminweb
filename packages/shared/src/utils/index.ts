/**
 * Format an amount as Indian Rupees (e.g. 1,00,000.00).
 *
 * Uses the Indian numbering system where digits are grouped as
 * the last three, then every two digits thereafter.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generate a sequential invoice number with a prefix.
 *
 * @example generateInvoiceNumber('INV', 42) => 'INV-000042'
 */
export function generateInvoiceNumber(prefix: string, sequence: number): string {
  const padded = String(sequence).padStart(6, '0');
  return `${prefix}-${padded}`;
}

export type GstRule = 'above_limit' | 'full' | 'none';

export interface GstResult {
  base: number;
  tax: number;
  total: number;
}

/**
 * Calculate GST for a given amount.
 *
 * - `'none'`        -- no tax applied
 * - `'full'`        -- tax applied on the entire amount
 * - `'above_limit'` -- tax applied only on the portion above `limit`
 */
export function calculateGST(
  amount: number,
  rate: number,
  rule: GstRule,
  limit?: number,
): GstResult {
  if (rule === 'none' || rate <= 0) {
    return { base: amount, tax: 0, total: amount };
  }

  if (rule === 'above_limit') {
    const threshold = limit ?? 0;
    const taxableAmount = Math.max(0, amount - threshold);
    const tax = taxableAmount * (rate / 100);
    return { base: amount, tax, total: amount + tax };
  }

  // rule === 'full'
  const tax = amount * (rate / 100);
  return { base: amount, tax, total: amount + tax };
}

/**
 * Calculate Late Payment Interest using simple interest.
 *
 * Formula: (principal * rate * days) / (365 * 100)
 */
export function calculateLPI(principal: number, rate: number, days: number): number {
  if (principal <= 0 || rate <= 0 || days <= 0) {
    return 0;
  }
  return (principal * rate * days) / (365 * 100);
}

export interface PaginationResult {
  offset: number;
  limit: number;
}

/**
 * Convert page number and limit into an offset/limit pair for SQL queries.
 *
 * Page numbers are 1-based. Values below 1 are clamped to sensible defaults.
 */
export function paginate(page: number, limit: number): PaginationResult {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.max(1, Math.floor(limit));
  return {
    offset: (safePage - 1) * safeLimit,
    limit: safeLimit,
  };
}
