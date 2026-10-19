import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportLogsPanel } from '@/components/reports/logs/report-logs';
import { optionsText } from '@/components/reports/logs/report-log-text';

const state = vi.hoisted(() => ({ filters: [] as unknown[], result: {} as Record<string, unknown> }));

vi.mock('@/hooks/use-reports', () => ({
  useReportLogs: (filters: unknown) => {
    state.filters.push(filters);
    return state.result;
  },
}));

const ROW = { user_id: 'u-1', user_name: 'Test Treasurer', report_key: 'gl.balance_sheet', report_name: 'Balance Sheet', row_count: 12, result: 'succeeded', error_code: null };

beforeEach(() => {
  state.filters = [];
  state.result = {
    data: {
      data: [
        { ...ROW, at: '2026-10-19T06:32:00Z', action: 'published', format: 'pdf', options: { as_of: { label: 'as of 30 Sep 2026' } }, announcement_id: 'a-1' },
        { ...ROW, at: '2026-10-19T06:31:00Z', action: 'exported', format: 'csv', options: null, announcement_id: null },
        { ...ROW, at: '2026-10-19T06:30:00Z', action: 'viewed', format: 'json', options: null, announcement_id: null },
      ],
      total: 3,
    },
  };
});

describe('Show Logs for reports (REP-10)', () => {
  it('lists the report viewed, exported and published with who and the format', () => {
    render(<ReportLogsPanel reportKey="gl.balance_sheet" />);

    const rows = within(screen.getByRole('table', { name: 'Report logs' })).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[4].textContent)).toEqual(['Published', 'Exported', 'Viewed']);
    expect(rows.map((row) => within(row).getAllByRole('cell')[5].textContent)).toEqual(['PDF', 'CSV', 'Screen']);
    expect(within(rows[0]).getByText('Test Treasurer')).toBeTruthy();
    expect(within(rows[0]).getByRole('link', { name: 'Published' }).getAttribute('href')).toBe('/announcements');
    expect(state.filters[0]).toEqual({ reportKey: 'gl.balance_sheet', from: undefined, to: undefined });
  });

  it('filters by date', () => {
    render(<ReportLogsPanel reportKey="gl.balance_sheet" />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } });
    expect(state.filters.at(-1)).toEqual({ reportKey: 'gl.balance_sheet', from: '2026-10-01', to: undefined });
  });

  it('says so when nothing happened', () => {
    state.result = { data: { data: [], total: 0 } };
    render(<ReportLogsPanel />);
    expect(screen.getByText('No activity in this period')).toBeTruthy();
  });

  it('reads resolved options by their label', () => {
    expect(optionsText({ period: { from: '2026-09-01', to: '2026-09-30', label: 'Sep 2026' }, block: 'A' })).toBe('Period: Sep 2026 · Block: A');
    expect(optionsText(null)).toBe('—');
  });
});
