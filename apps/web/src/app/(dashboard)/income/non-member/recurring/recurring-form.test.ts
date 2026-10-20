import { describe, expect, it } from 'vitest';
import { emptyRecurringForm, recurringErrors, toRecurringPayload } from './recurring-form';

// INC-66: the payer's recurring invoice form.

describe('recurring invoice form', () => {
  it('needs each line described and priced, a start today or later and an end not before it', () => {
    const form = emptyRecurringForm('2026-10-01');
    expect(Object.keys(recurringErrors(form, '2026-10-20')).sort()).toEqual(['line0.amount', 'line0.description', 'startDate']);
    const ok = { ...form, startDate: '2026-11-01', lines: [{ description: 'Pantry rent', amount: '5000', gstRate: '18', accountId: '' }] };
    expect(recurringErrors(ok, '2026-10-20')).toEqual({});
    expect(recurringErrors({ ...ok, endDate: '2026-10-31' }, '2026-10-20')).toEqual({ endDate: 'Not before the start' });
  });

  it('sends what the API takes', () => {
    const form = { ...emptyRecurringForm('2026-11-01'), lines: [{ description: ' Pantry rent ', amount: '5000', gstRate: '18', accountId: 'a1' }], dueDays: '15', autoPost: true };
    expect(toRecurringPayload('c1', form)).toEqual({
      customer_id: 'c1',
      lines: [{ description: 'Pantry rent', amount: 5000, gst_rate: 18, income_account_id: 'a1' }],
      frequency: 'monthly',
      start_date: '2026-11-01',
      end_date: null,
      due_days: 15,
      auto_post: true,
    });
  });
});
