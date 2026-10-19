import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsPageSwitch } from './reports-page-switch';

const state = vi.hoisted(() => ({ search: '', error: null as unknown }));

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(state.search) }));
vi.mock('@/hooks/use-reports', () => ({ useReportCatalogue: () => ({ error: state.error }) }));
vi.mock('@/components/reports/reports-index', () => ({ ReportsIndex: () => <p>Index</p> }));
vi.mock('./reports-content', () => ({ default: () => <p>Six reports</p> }));

beforeEach(() => {
  state.search = '';
  state.error = null;
});

describe('/reports (decision R1)', () => {
  it('shows the Admin Reports index', () => {
    render(<ReportsPageSwitch />);
    expect(screen.getByText('Index')).toBeTruthy();
  });

  it("keeps today's views for the dashboard's ?report= links", () => {
    state.search = 'report=trial-balance';
    render(<ReportsPageSwitch />);
    expect(screen.getByText('Six reports')).toBeTruthy();
  });

  it("keeps today's views while the API has no report registry", () => {
    state.error = Object.assign(new Error('Not Found'), { status: 404 });
    render(<ReportsPageSwitch />);
    expect(screen.getByText('Six reports')).toBeTruthy();
  });
});
