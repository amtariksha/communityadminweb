/**
 * EXP-06 / EXP-08 — the purchase request line maths as the server does it,
 * so the page's live totals match what is stored:
 *
 *   taxable = round(qty × rate); CGST = SGST = round(taxable × rate ÷ 200);
 *   IGST = round(taxable × rate ÷ 100); rounding half up to the paisa.
 *
 * Amounts are worked in paise with BigInt, never floats.
 */
export type GstType = 'cgst_sgst' | 'igst' | 'none';

export const GST_TYPE_LABELS: Readonly<Record<GstType, string>> = {
  cgst_sgst: 'CGST + SGST',
  igst: 'IGST',
  none: 'No GST',
};

export interface LineAmounts {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

// The admin web targets ES2017, so BigInt values come from BigInt() rather than literals.
const TWO = BigInt(2);
const THOUSAND = BigInt(1000);
const HALF_RATE = BigInt(20_000);
const FULL_RATE = BigInt(10_000);

function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * TWO + denominator) / (denominator * TWO);
}

/** Paise of one line; a blank or bad number counts as 0. */
export function lineAmounts(quantity: number, unitRate: number, gstType: GstType, gstRate: number): LineAmounts {
  const valid = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const milli = BigInt(Math.round(valid(quantity) * 1000));
  const ratePaise = BigInt(Math.round(valid(unitRate) * 100));
  const taxableBig = divideHalfUp(milli * ratePaise, THOUSAND);
  const hundredths = BigInt(Math.round(valid(gstRate) * 100));
  const taxable = Number(taxableBig);
  if (gstType === 'cgst_sgst') {
    const half = Number(divideHalfUp(taxableBig * hundredths, HALF_RATE));
    return { taxable, cgst: half, sgst: half, igst: 0, total: taxable + 2 * half };
  }
  if (gstType === 'igst') {
    const igst = Number(divideHalfUp(taxableBig * hundredths, FULL_RATE));
    return { taxable, cgst: 0, sgst: 0, igst, total: taxable + igst };
  }
  return { taxable, cgst: 0, sgst: 0, igst: 0, total: taxable };
}

export function sumAmounts(lines: readonly LineAmounts[]): LineAmounts {
  return lines.reduce(
    (acc, line) => ({
      taxable: acc.taxable + line.taxable,
      cgst: acc.cgst + line.cgst,
      sgst: acc.sgst + line.sgst,
      igst: acc.igst + line.igst,
      total: acc.total + line.total,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  );
}

/** ₹ with Indian grouping and two decimals, from paise. */
export function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function stateOf(gstin: string | null | undefined): string | null {
  const match = /^(\d{2})/.exec((gstin ?? '').trim());
  return match ? match[1] : null;
}

/**
 * IGST when the vendor is in another state than the society, CGST + SGST
 * in the same state or when either state is unknown (the server's rule).
 */
export function defaultGstType(
  societyStateCode: string | null | undefined,
  vendor: { state_code?: string | null; gstin?: string | null } | null | undefined,
): Exclude<GstType, 'none'> {
  const vendorState = vendor?.state_code?.trim() || stateOf(vendor?.gstin);
  if (!societyStateCode || !vendorState) return 'cgst_sgst';
  return societyStateCode === vendorState.padStart(2, '0') ? 'cgst_sgst' : 'igst';
}

/** The rates a line dated `date` may carry: the society's, plus 12 / 28 before the reform. */
export function ratesFor(
  gst: { rate_options: number[]; pre_reform_rates: number[]; reform_date: string } | null | undefined,
  date: string,
): number[] {
  const base = gst?.rate_options ?? [0, 5, 18, 40];
  const old = gst && date && date < gst.reform_date ? gst.pre_reform_rates : [];
  return [...new Set([...base, ...old])].sort((a, b) => a - b);
}

export const HSN_SAC_PATTERN = /^\d{4}(\d{2}){0,2}$/;
export const HSN_SAC_MESSAGE = 'HSN/SAC must be 4, 6 or 8 digits';
