/** The Online payment charges card's two fields, held as form text. */
export interface GatewayChargeForm {
  /** Ticked = the society pays the charge (`absorbed`); unticked = residents pay (`pass_through`). */
  absorbed: boolean;
  percent: string;
}

export type GatewayChargeErrors = Partial<Record<'percent', string>>;

export function readGatewayCharge(settings: unknown): GatewayChargeForm {
  const value = (settings ?? {}) as Record<string, unknown>;
  return {
    absorbed: value.gateway_fee_mode === 'absorbed',
    percent: typeof value.gateway_fee_percent === 'number' ? String(value.gateway_fee_percent) : '',
  };
}

export function gatewayChargeErrors(form: GatewayChargeForm): GatewayChargeErrors {
  const text = form.percent.trim();
  // When the society pays, no percent is needed; one that is typed is still checked.
  if (text === '' && form.absorbed) return {};
  const percent = Number(text);
  const valid =
    text !== '' &&
    Number.isFinite(percent) &&
    percent >= 0 &&
    percent <= 5 &&
    Math.abs(percent * 100 - Math.round(percent * 100)) < 1e-6;
  return valid ? {} : { percent: 'Enter a charge from 0 to 5, with at most two decimals.' };
}

/** What PATCH /tenants/:id/settings stores; each key is merged on its own. */
export function toGatewayChargePayload(form: GatewayChargeForm): {
  gateway_fee_mode: 'pass_through' | 'absorbed';
  gateway_fee_percent?: number;
} {
  const payload: { gateway_fee_mode: 'pass_through' | 'absorbed'; gateway_fee_percent?: number } = {
    gateway_fee_mode: form.absorbed ? 'absorbed' : 'pass_through',
  };
  if (form.percent.trim() !== '') payload.gateway_fee_percent = Number(form.percent);
  return payload;
}

export function sameGatewayCharge(a: GatewayChargeForm, b: GatewayChargeForm): boolean {
  const pa = toGatewayChargePayload(a);
  const pb = toGatewayChargePayload(b);
  return pa.gateway_fee_mode === pb.gateway_fee_mode && pa.gateway_fee_percent === pb.gateway_fee_percent;
}
