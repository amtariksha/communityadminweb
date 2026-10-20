/** The Online payment charges card's fields, held as form text. */
export interface GatewayChargeForm {
  /** Ticked = the society pays the charge (`absorbed`); unticked = residents pay (`pass_through`). */
  absorbed: boolean;
  percent: string;
  /** INC-43: when the society pays, only on payments of at least this amount (blank = every payment). */
  minAmount: string;
}

export type GatewayChargeErrors = Partial<Record<'percent' | 'minAmount', string>>;

const MAX_MIN_AMOUNT = 10_000_000;

export function readGatewayCharge(settings: unknown): GatewayChargeForm {
  const value = (settings ?? {}) as Record<string, unknown>;
  const minAmount = (value.billing_gateway as { absorb_min_amount?: unknown } | undefined)?.absorb_min_amount;
  return {
    absorbed: value.gateway_fee_mode === 'absorbed',
    percent: typeof value.gateway_fee_percent === 'number' ? String(value.gateway_fee_percent) : '',
    minAmount: typeof minAmount === 'number' ? String(minAmount) : '',
  };
}

const twoDecimals = (amount: number): boolean => Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6;

function minAmountError(form: GatewayChargeForm): string | null {
  const text = form.minAmount.trim();
  if (!form.absorbed || text === '') return null;
  const amount = Number(text);
  const valid = Number.isFinite(amount) && amount >= 0 && amount <= MAX_MIN_AMOUNT && twoDecimals(amount);
  return valid ? null : 'Enter an amount of 0 or more, with at most two decimals.';
}

function percentError(form: GatewayChargeForm): string | null {
  const text = form.percent.trim();
  // When the society pays, no percent is needed; one that is typed is still checked.
  if (text === '' && form.absorbed) return null;
  const percent = Number(text);
  const valid = text !== '' && Number.isFinite(percent) && percent >= 0 && percent <= 5 && twoDecimals(percent);
  return valid ? null : 'Enter a charge from 0 to 5, with at most two decimals.';
}

export function gatewayChargeErrors(form: GatewayChargeForm): GatewayChargeErrors {
  const errors: GatewayChargeErrors = {};
  const percent = percentError(form);
  const minAmount = minAmountError(form);
  if (percent) errors.percent = percent;
  if (minAmount) errors.minAmount = minAmount;
  return errors;
}

export interface GatewayChargePayload {
  gateway_fee_mode: 'pass_through' | 'absorbed';
  gateway_fee_percent?: number;
  billing_gateway?: { absorb_min_amount: number | null };
}

/**
 * What PATCH /tenants/:id/settings stores; each key is merged on its own.
 * The minimum is sent only when the society pays (the payment service reads
 * it only then), so unticking keeps it for the next time.
 */
export function toGatewayChargePayload(form: GatewayChargeForm): GatewayChargePayload {
  const payload: GatewayChargePayload = { gateway_fee_mode: form.absorbed ? 'absorbed' : 'pass_through' };
  if (form.percent.trim() !== '') payload.gateway_fee_percent = Number(form.percent);
  if (form.absorbed) {
    const text = form.minAmount.trim();
    payload.billing_gateway = { absorb_min_amount: text === '' ? null : Number(text) };
  }
  return payload;
}

export function sameGatewayCharge(a: GatewayChargeForm, b: GatewayChargeForm): boolean {
  const pa = toGatewayChargePayload(a);
  const pb = toGatewayChargePayload(b);
  return (
    pa.gateway_fee_mode === pb.gateway_fee_mode &&
    pa.gateway_fee_percent === pb.gateway_fee_percent &&
    pa.billing_gateway?.absorb_min_amount === pb.billing_gateway?.absorb_min_amount
  );
}
