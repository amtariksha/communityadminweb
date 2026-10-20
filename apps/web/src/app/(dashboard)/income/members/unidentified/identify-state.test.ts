import { describe, expect, it } from 'vitest';
import type { OpenBill } from '@/hooks/use-unit-statement';
import { emptyIdentifyForm, identifyErrors, identifySplit, toIdentifyPayload } from './identify-state';

/** INC-48 — Identify: the unit, FiFo or picked bills, the rest the unit's advance. */
const bill = (id: string, remaining: string): OpenBill => ({
  id,
  invoice_number: `INV-${id}`,
  bill_date: '2026-09-01',
  due_date: '2026-09-11',
  account: 'Maintenance',
  details: 'Sep 2026',
  bill_amount: remaining,
  remaining,
  income_scope: 'member',
});
const bills = [bill('a', '3000.00'), bill('b', '2000.00')];

describe('identify state', () => {
  it('needs the unit', () => {
    expect(identifyErrors(emptyIdentifyForm(), [], '4000.00').unitId).toBeTruthy();
  });

  it('sends FiFo for the server to spread', () => {
    const form = { ...emptyIdentifyForm(), unitId: 'u-1', payerMemberId: 'm-1' };
    expect(toIdentifyPayload(form, bills)).toEqual({ unit_id: 'u-1', payer_member_id: 'm-1', allocation_mode: 'fifo' });
    expect(identifySplit(form, bills, '4000.00')).toEqual({ onBills: 4000, advance: 0 });
    expect(identifySplit(form, bills, '6000.00')).toEqual({ onBills: 5000, advance: 1000 });
  });

  it('sends the picked bills and keeps the rest as the advance', () => {
    const form = { ...emptyIdentifyForm(), unitId: 'u-1', fifo: false, picks: { b: { selected: true, amount: '2000' } } };
    expect(identifyErrors(form, bills, '4000.00')).toEqual({});
    expect(toIdentifyPayload(form, bills)).toEqual({ unit_id: 'u-1', allocation_mode: 'selected', allocations: [{ invoice_id: 'b', amount: 2000 }] });
    expect(identifySplit(form, bills, '4000.00')).toEqual({ onBills: 2000, advance: 2000 });
  });

  it('refuses bills worth more than the collection or a bill overpaid', () => {
    const over = { ...emptyIdentifyForm(), unitId: 'u-1', fifo: false, picks: { a: { selected: true, amount: '3000' }, b: { selected: true, amount: '2000' } } };
    expect(identifyErrors(over, bills, '4000.00').bills).toMatch(/more than the collection/);
    const overpaid = { ...emptyIdentifyForm(), unitId: 'u-1', fifo: false, picks: { a: { selected: true, amount: '3500' } } };
    expect(identifyErrors(overpaid, bills, '4000.00')['bill.a']).toBe('Up to 3000.00');
  });
});
