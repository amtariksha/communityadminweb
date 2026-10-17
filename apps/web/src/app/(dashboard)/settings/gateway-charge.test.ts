import { describe, expect, it } from 'vitest';
import { gatewayChargeErrors, readGatewayCharge, sameGatewayCharge, toGatewayChargePayload } from './gateway-charge';

describe('readGatewayCharge', () => {
  it('is "resident pays" with no percent when nothing is saved', () => {
    expect(readGatewayCharge(undefined)).toEqual({ absorbed: false, percent: '' });
    expect(readGatewayCharge({})).toEqual({ absorbed: false, percent: '' });
  });

  it('reads the saved mode and percent', () => {
    expect(readGatewayCharge({ gateway_fee_mode: 'absorbed', gateway_fee_percent: 2.5 })).toEqual({
      absorbed: true,
      percent: '2.5',
    });
    expect(readGatewayCharge({ gateway_fee_mode: 'pass_through', gateway_fee_percent: 0 })).toEqual({
      absorbed: false,
      percent: '0',
    });
  });
});

describe('gatewayChargeErrors', () => {
  it('needs a percent from 0 to 5 with at most two decimals when residents pay', () => {
    expect(gatewayChargeErrors({ absorbed: false, percent: '' }).percent).toBeDefined();
    expect(gatewayChargeErrors({ absorbed: false, percent: '5.01' }).percent).toBeDefined();
    expect(gatewayChargeErrors({ absorbed: false, percent: '-1' }).percent).toBeDefined();
    expect(gatewayChargeErrors({ absorbed: false, percent: '2.345' }).percent).toBeDefined();
    expect(gatewayChargeErrors({ absorbed: false, percent: '0' })).toEqual({});
    expect(gatewayChargeErrors({ absorbed: false, percent: '2.35' })).toEqual({});
  });

  it('does not need a percent when the society pays, but still checks one that is typed', () => {
    expect(gatewayChargeErrors({ absorbed: true, percent: '' })).toEqual({});
    expect(gatewayChargeErrors({ absorbed: true, percent: '9' }).percent).toBeDefined();
  });
});

describe('toGatewayChargePayload', () => {
  it('sends the mode, and the percent when there is one', () => {
    expect(toGatewayChargePayload({ absorbed: false, percent: '2' })).toEqual({
      gateway_fee_mode: 'pass_through',
      gateway_fee_percent: 2,
    });
    expect(toGatewayChargePayload({ absorbed: true, percent: '' })).toEqual({ gateway_fee_mode: 'absorbed' });
    expect(toGatewayChargePayload({ absorbed: true, percent: '2' })).toEqual({
      gateway_fee_mode: 'absorbed',
      gateway_fee_percent: 2,
    });
  });
});

describe('sameGatewayCharge', () => {
  it('compares mode and percent numerically', () => {
    expect(sameGatewayCharge({ absorbed: false, percent: '2' }, { absorbed: false, percent: '2.0' })).toBe(true);
    expect(sameGatewayCharge({ absorbed: false, percent: '2' }, { absorbed: true, percent: '2' })).toBe(false);
  });
});
