import { describe, expect, it } from 'vitest';
import { activeRules, ruleGst, ruleGstLabel } from './invoice-rule';

describe('ruleGst', () => {
  it('reads gst_rule and gst_percentage, which is what the API returns', () => {
    expect(ruleGst({ gst_rule: 'full', gst_percentage: '18.00' })).toEqual({ applies: true, rate: 18 });
    expect(ruleGst({ gst_rule: 'above_limit', gst_percentage: 12 })).toEqual({ applies: true, rate: 12 });
  });

  it('is not applicable for rule none, whatever rate is stored', () => {
    expect(ruleGst({ gst_rule: 'none', gst_percentage: '18.00' })).toEqual({ applies: false, rate: 0 });
  });

  it('falls back to the older field names when the API row carries those', () => {
    expect(ruleGst({ is_gst_applicable: true, gst_rate: 5 })).toEqual({ applies: true, rate: 5 });
    expect(ruleGst({})).toEqual({ applies: false, rate: 0 });
  });
});

describe('ruleGstLabel', () => {
  it('shows the rate, or N/A', () => {
    expect(ruleGstLabel({ gst_rule: 'full', gst_percentage: '18.00' })).toBe('18%');
    expect(ruleGstLabel({ gst_rule: 'none', gst_percentage: 0 })).toBe('N/A');
    expect(ruleGstLabel({ gst_rule: 'full', gst_percentage: '2.50' })).toBe('2.5%');
  });
});

describe('activeRules', () => {
  it('leaves out switched-off rules', () => {
    expect(activeRules([{ id: 'a', is_active: true }, { id: 'b', is_active: false }]).map((r) => r.id)).toEqual(['a']);
  });
});
