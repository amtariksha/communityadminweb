import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReportSchedulesCard } from './report-schedules-card';

const state = vi.hoisted(() => ({ schedules: {} as Record<string, unknown> }));

vi.mock('@/hooks/use-reports', () => ({
  useReportSchedules: () => state.schedules,
  useReportCatalogue: () => ({ data: [{ key: 'gl.trial_balance', name: 'Trial Balance' }] }),
}));
vi.mock('./automated-reports-card', () => ({ AutomatedReportsCard: () => <p>Monthly digest card</p> }));

describe('Settings › Automated reports (REP-08, REP-S7)', () => {
  it("lists the society's active schedules with a link to Admin Reports", () => {
    state.schedules = {
      data: [
        { id: 's-1', report_key: 'gl.trial_balance', frequency: 'monthly', day_of_month: 5, day_of_week: null, month_of_quarter: null, time_of_day: '14:00', is_active: true },
        { id: 's-2', report_key: 'gl.trial_balance', frequency: 'daily', day_of_month: null, day_of_week: null, month_of_quarter: null, time_of_day: '09:00', is_active: false },
      ],
    };
    render(<ReportSchedulesCard />);
    expect(screen.getByText('Trial Balance')).toBeTruthy();
    expect(screen.getByText(/Monthly on day 5 at 14:00/)).toBeTruthy();
    expect(screen.queryByText(/Daily/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Open Admin Reports' }).getAttribute('href')).toBe('/admin-reports');
  });

  it('keeps the monthly digest card while the API has no schedules', () => {
    state.schedules = { data: undefined, error: Object.assign(new Error('Not Found'), { status: 404 }) };
    render(<ReportSchedulesCard />);
    expect(screen.getByText('Monthly digest card')).toBeTruthy();
  });
});
