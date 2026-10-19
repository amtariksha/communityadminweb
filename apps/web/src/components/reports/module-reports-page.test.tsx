import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_CATALOGUE } from './catalogue-fixture';
import { ModuleReportsPage } from './module-reports-page';
import { reportsMenuNode, REPORT_ROUTE_FAMILIES } from './module-reports';

const state = vi.hoisted(() => ({ module: undefined as string | undefined, rows: [] as unknown[] }));

vi.mock('@/hooks/use-reports', () => ({
  useReportCatalogue: (module?: string) => {
    state.module = module;
    return { data: state.rows, isLoading: false, error: null, refetch: vi.fn() };
  },
}));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));

beforeEach(() => {
  state.rows = SAMPLE_CATALOGUE.filter((row) => row.module === 'general_ledger');
});

describe('module Reports page (REP-04)', () => {
  it("asks for the module's section only and shows it", () => {
    render(<ModuleReportsPage module="general_ledger" />);

    expect(state.module).toBe('general_ledger');
    const section = within(screen.getByRole('region', { name: 'General Ledger' }));
    expect(section.getByRole('link', { name: 'Balance Sheet' }).getAttribute('href')).toBe(
      '/admin-reports/gl.balance_sheet?from=ledger',
    );
  });

  it('says when a module has no reports yet', () => {
    state.rows = [];
    render(<ModuleReportsPage module="general_ledger" />);
    expect(screen.getByText('No reports for this module yet.')).toBeTruthy();
  });
});

describe('Reports menu entries from the registry', () => {
  it('gives a registered module its Reports page and keeps the others planned', () => {
    expect(reportsMenuNode('ledger', 'REP-04')).toEqual({ id: 'ledger.reports', label: 'Reports', href: '/accounts/reports' });
    expect(reportsMenuNode('gate', 'GATE-30')).toEqual({ id: 'gate.reports', label: 'Reports', href: '/gate/reports' });
    expect(reportsMenuNode('forms', 'REP-04')).toEqual({ id: 'forms.reports', label: 'Reports', planned: 'REP-04' });
  });

  it('puts every Reports page under the Reports menu entry', () => {
    expect(REPORT_ROUTE_FAMILIES).toContainEqual(['/admin-reports', '/reports']);
    expect(REPORT_ROUTE_FAMILIES).toContainEqual(['/accounts/reports', '/reports']);
  });
});
