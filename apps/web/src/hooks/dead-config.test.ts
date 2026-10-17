import { describe, expect, it } from 'vitest';
import * as hooks from '@/hooks';

/**
 * INC-13 — the Unit Billing Cycles tab saved settings that nothing read, so
 * it and its hooks are gone (the table and its data stay in the database).
 * `useRecalculateArrears` had no caller; INC-22 adds one with the unit
 * statement's "Recalculate balances" item.
 */
describe('dead billing configuration', () => {
  it('has no billing-cycle or recalculate-arrears hooks', () => {
    const exported = hooks as Record<string, unknown>;
    expect(exported.useUnitBillingCycles).toBeUndefined();
    expect(exported.useUpsertUnitBillingCycle).toBeUndefined();
    expect(exported.useRecalculateArrears).toBeUndefined();
  });
});
