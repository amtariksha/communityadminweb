import { describe, expect, it } from 'vitest';
import { gatewayChargeErrors, readGatewayCharge, sameGatewayCharge, toGatewayChargePayload } from './gateway-charge';

describe('readGatewayCharge', () => {
  it('is "resident pays" with no percent when nothing is saved', () => {
    expect(readGatewayCharge(undefined)).toEqual({ absorbed: false, percent: '', minAmount: '' });
    expect(readGatewayCharge({})).toEqual({ absorbed: false, percent: '', minAmount: '' });
  });

  it('reads the saved mode and percent', () => {
    expect(readGatewayCharge({ gateway_fee_mode: 'absorbed', gateway_fee_percent: 2.5 })).toEqual({
      absorbed: true,
      percent: '2.5',
      minAmount: '',
    });
    expect(readGatewayCharge({ gateway_fee_mode: 'pass_through', gateway_fee_percent: 0 })).toEqual({
      absorbed: false,
      percent: '0',
      minAmount: '',
    });
  });
});

describe('readGatewayCharge minimum (INC-43)', () => {
  it('reads billing_gateway.absorb_min_amount', () => {
    expect(readGatewayCharge({ gateway_fee_mode: 'absorbed', billing_gateway: { absorb_min_amount: 5000 } }).minAmount).toBe('5000');
    expect(readGatewayCharge({ billing_gateway: { absorb_min_amount: null } }).minAmount).toBe('');
  });
});

describe('gatewayChargeErrors', () => {
  it('checks the minimum only when the society pays (INC-43)', () => {
    expect(gatewayChargeErrors({ absorbed: true, percent: '', minAmount: '-1' }).minAmount).toBeDefined();
    expect(gatewayChargeErrors({ absorbed: true, percent: '', minAmount: '10.555' }).minAmount).toBeDefined();
    expect(gatewayChargeErrors({ absorbed: true, percent: '', minAmount: '5000' })).toEqual({});
    expect(gatewayChargeErrors({ absorbed: false, percent: '2', minAmount: 'abc' })).toEqual({});
  });

  it('needs a percent from 0 to 5 with at most two decimals when residents pay', () => {
    expect(gatewayChargeErrors({ absorbed: false, percent: '', minAmount: '' }).percent).toBeDefined();
    expect(gatewayChargeErrors({ absorbed: false, percent: '5.01', minAmount: '' }).percent).toBeDefined();
    expect(gatewayChargeErrors({ absorbed: false, percent: '-1', minAmount: '' }).percent).toBeDefined();
    expect(gatewayChargeErrors({ absorbed: false, percent: '2.345', minAmount: '' }).percent).toBeDefined();
    expect(gatewayChargeErrors({ absorbed: false, percent: '0', minAmount: '' })).toEqual({});
    expect(gatewayChargeErrors({ absorbed: false, percent: '2.35', minAmount: '' })).toEqual({});
  });

  it('does not need a percent when the society pays, but still checks one that is typed', () => {
    expect(gatewayChargeErrors({ absorbed: true, percent: '', minAmount: '' })).toEqual({});
    expect(gatewayChargeErrors({ absorbed: true, percent: '9', minAmount: '' }).percent).toBeDefined();
  });
});

describe('toGatewayChargePayload', () => {
  it('sends the mode, and the percent when there is one', () => {
    expect(toGatewayChargePayload({ absorbed: false, percent: '2', minAmount: '' })).toEqual({
      gateway_fee_mode: 'pass_through',
      gateway_fee_percent: 2,
    });
    expect(toGatewayChargePayload({ absorbed: true, percent: '', minAmount: '' })).toEqual({
      gateway_fee_mode: 'absorbed',
      billing_gateway: { absorb_min_amount: null },
    });
    expect(toGatewayChargePayload({ absorbed: true, percent: '2', minAmount: '5000' })).toEqual({
      gateway_fee_mode: 'absorbed',
      gateway_fee_percent: 2,
      billing_gateway: { absorb_min_amount: 5000 },
    });
  });

  it('keeps the minimum out of a "residents pay" save (INC-43)', () => {
    expect(toGatewayChargePayload({ absorbed: false, percent: '2', minAmount: '5000' })).toEqual({
      gateway_fee_mode: 'pass_through',
      gateway_fee_percent: 2,
    });
  });
});

describe('sameGatewayCharge', () => {
  it('compares mode and percent numerically', () => {
    expect(sameGatewayCharge({ absorbed: false, percent: '2', minAmount: '' }, { absorbed: false, percent: '2.0', minAmount: '' })).toBe(true);
    expect(sameGatewayCharge({ absorbed: false, percent: '2', minAmount: '' }, { absorbed: true, percent: '2', minAmount: '' })).toBe(false);
    expect(sameGatewayCharge({ absorbed: true, percent: '', minAmount: '5000' }, { absorbed: true, percent: '', minAmount: '5000.00' })).toBe(true);
    expect(sameGatewayCharge({ absorbed: true, percent: '', minAmount: '' }, { absorbed: true, percent: '', minAmount: '100' })).toBe(false);
  });
});
