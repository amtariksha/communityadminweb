import { describe, expect, it } from 'vitest';
import type { MeterRule } from '@/hooks/use-meter-rules';
import { emptyRuleForm, formFromRule, ruleFormErrors, slabRange, toRuleInput, type RuleForm } from './rule-form-state';

/** UTIL-13 — the ten-slab meter rule form. */
const filled = (slabs: Array<[string, string]>, patch: Partial<RuleForm> = {}): RuleForm => {
  const form = { ...emptyRuleForm('water', '2026-11-01'), ledgerAccountId: 'acct-water', ...patch };
  slabs.forEach(([upto, rate], index) => {
    form.slabs[index] = { upto, rate };
  });
  return form;
};

describe('meter rule form', () => {
  it('sends the filled slabs, the last one open-ended, and ignores the blank rows', () => {
    const form = filled([['10', '5'], ['20', '7'], ['', '10']]);

    expect(ruleFormErrors(form)).toEqual({});
    expect(toRuleInput(form)).toEqual({
      ledger_account_id: 'acct-water',
      memorize_readings: true,
      cumulative_slab: false,
      minimum_charge: 0,
      effective_from: '2026-11-01',
      slabs: [
        { upto: 10, rate: 5 },
        { upto: 20, rate: 7 },
        { upto: null, rate: 10 },
      ],
    });
  });

  it('says which slab is out of order, and refuses an open slab before the last', () => {
    expect(ruleFormErrors(filled([['10', '5'], ['20', '7'], ['15', '10']]))).toEqual({ 'slabs.2.upto': 'Slab 3 must be above slab 2.' });
    expect(ruleFormErrors(filled([['', '5'], ['20', '7']]))).toEqual({
      'slabs.0.upto': 'Slab 1 needs its units: only the last slab may be open-ended.',
    });
  });

  it('needs the account, slab 1, and a revision date after the current version', () => {
    const errors = ruleFormErrors({ ...emptyRuleForm('gas', '2026-11-01') }, '2026-11-01');
    expect(errors).toMatchObject({
      ledgerAccountId: 'Pick the income account.',
      effectiveFrom: 'Pick a date after 2026-11-01.',
      'slabs.0.rate': 'Fill slab 1.',
    });
  });

  it('opens a revision with the saved rule', () => {
    const rule = {
      id: 'r1', meter_type: 'gas', ledger_account_id: 'acct-gas', ledger_account_name: 'Gas', ledger_account_code: '4010',
      memorize_readings: false, cumulative_slab: true, minimum_charge: '100.00', effective_from: '2026-04-01', effective_to: null,
      revises_rule_id: null, status: 'active', in_use: true,
      slabs: [
        { id: 's1', slab_from: '0.00', slab_to: '10.00', rate_per_unit: '5.00' },
        { id: 's2', slab_from: '10.00', slab_to: null, rate_per_unit: '7.50' },
      ],
    } as MeterRule;

    const form = formFromRule(rule, '2026-12-01');

    expect(form).toMatchObject({ meterType: 'gas', ledgerAccountId: 'acct-gas', memorize: false, cumulative: true, minimumCharge: '100', effectiveFrom: '2026-12-01' });
    expect(form.slabs.slice(0, 3)).toEqual([{ upto: '10', rate: '5' }, { upto: '', rate: '7.5' }, { upto: '', rate: '' }]);
    expect(slabRange(rule.slabs[0])).toBe('0 – 10');
    expect(slabRange(rule.slabs[1])).toBe('10 and above');
  });
});
