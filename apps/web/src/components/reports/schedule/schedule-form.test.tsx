import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { catalogueRow } from '../catalogue-fixture';
import { ScheduleForm } from './schedule-form';
import { frequencyText, initialForm, scheduleBody } from './schedule-form-state';

vi.mock('@/hooks/use-unit-blocks', () => ({ useUnitBlocks: () => ({ data: undefined }) }));

const ROW = catalogueRow({
  key: 'gl.income_expenditure',
  name: 'Income & Expenditure',
  params: [
    { key: 'period', label: 'Period', type: 'date_range', required: true, default: 'current_fy' },
    { key: 'block', label: 'Block', type: 'block', required: false },
  ],
});

describe('Schedule Report form (REP-08)', () => {
  it('starts monthly on the 1st at 09:00 with the previous month, as a PDF to the committee', () => {
    const values = initialForm(ROW, '2026-10-19');
    expect(values).toMatchObject({
      frequency: 'monthly',
      day_of_month: 1,
      time_of_day: '09:00',
      periods: { period: 'previous_month' },
      format: 'pdf',
      recipient_roles: ['community_admin', 'committee_member'],
    });
  });

  it('builds the body with the period kept relative and only the timing the frequency uses', () => {
    const values = { ...initialForm(ROW, '2026-10-19'), day_of_month: 3, time_of_day: '08:00', recipient_emails: 'a@example.com, b@example.com' };
    const result = scheduleBody(ROW, values);
    expect(result).toEqual({
      body: expect.objectContaining({
        report_key: 'gl.income_expenditure',
        params: { period: 'previous_month' },
        frequency: 'monthly',
        day_of_week: null,
        day_of_month: 3,
        month_of_quarter: null,
        time_of_day: '08:00',
        recipient_emails: ['a@example.com', 'b@example.com'],
      }),
    });
  });

  it('refuses a bad address, more than ten, or nobody to send to', () => {
    const base = initialForm(ROW, '2026-10-19');
    expect(scheduleBody(ROW, { ...base, recipient_emails: 'not-an-address' })).toEqual({ error: '"not-an-address" is not an e-mail address.' });
    const eleven = Array.from({ length: 11 }, (_, i) => `p${i}@example.com`).join(',');
    expect(scheduleBody(ROW, { ...base, recipient_emails: eleven })).toEqual({ error: 'At most 10 e-mail addresses.' });
    expect(scheduleBody(ROW, { ...base, recipient_roles: [] })).toEqual({ error: 'Choose who receives the e-mail.' });
  });

  it('reads a schedule back as text', () => {
    expect(frequencyText({ frequency: 'weekly', day_of_week: 7, day_of_month: null, month_of_quarter: null, time_of_day: '07:15' })).toBe(
      'Weekly on Sunday at 07:15',
    );
    expect(frequencyText({ frequency: 'quarterly', day_of_week: null, day_of_month: 5, month_of_quarter: 2, time_of_day: '09:00' })).toBe(
      'Quarterly, 2nd month, day 5 at 09:00',
    );
  });

  it('saves from the form', () => {
    const onSave = vi.fn();
    render(<ScheduleForm row={ROW} busy={false} error={null} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ report_key: 'gl.income_expenditure', frequency: 'monthly' }));
  });
});
