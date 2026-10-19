import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BillingRunsPanel } from './billing-runs-panel';
import { describeGenerateResult } from './generate-summary';
import type { BillingRun } from '@/hooks';
import { ApiError } from '@/lib/api-error';

const mocks = vi.hoisted(() => ({
  query: { data: undefined, isLoading: false, isError: false, error: null } as {
    data: BillingRun[] | undefined;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  },
}));

vi.mock('@/hooks', () => ({ useBillingRuns: () => mocks.query }));

function run(overrides: Partial<BillingRun>): BillingRun {
  return {
    id: 'run-1',
    run_type: 'legacy_rules',
    run_date: '2026-10-01',
    period_label: 'Oct 2026',
    status: 'completed',
    invoices_created: 3,
    units_skipped: 0,
    errors: [],
    triggered_by: 'scheduler',
    started_at: '2026-09-30T18:31:00.000Z',
    finished_at: '2026-09-30T18:31:04.000Z',
    ...overrides,
  };
}

function showRuns(runs: BillingRun[]): void {
  mocks.query = { data: runs, isLoading: false, isError: false, error: null };
}

afterEach(() => {
  mocks.query = { data: undefined, isLoading: false, isError: false, error: null };
});

describe('BillingRunsPanel', () => {
  it('lists each run with its period, status and counts', () => {
    showRuns([
      run({ id: 'a', status: 'completed', invoices_created: 3, units_skipped: 0 }),
      run({ id: 'b', run_date: '2026-08-01', period_label: 'Aug 2026', status: 'failed', invoices_created: 0, units_skipped: 2 }),
    ]);
    render(<BillingRunsPanel />);

    const cells = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent));
    expect(cells).toEqual([
      ['01 Oct 2026', 'Oct 2026', 'Completed', '3', '0', '—'],
      ['01 Aug 2026', 'Aug 2026', 'Failed', '0', '2', '—'],
    ]);
  });

  it('expands a run to show each failed rule and its reason', () => {
    showRuns([
      run({
        status: 'completed_with_errors',
        errors: [
          { rule_id: 'r1', rule_name: 'Maintenance', message: 'ledger account is inactive' },
          { rule_id: null, rule_name: null, message: 'timeout' },
        ],
      }),
    ]);
    render(<BillingRunsPanel />);

    expect(screen.getByText('Completed with errors')).toBeTruthy();
    expect(screen.queryByText('ledger account is inactive')).toBeNull();

    const toggle = screen.getByRole('button', { name: /2 errors/ });
    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Maintenance:')).toBeTruthy();
    expect(screen.getByText('ledger account is inactive')).toBeTruthy();
    expect(screen.getByText('Billing run:')).toBeTruthy();

    fireEvent.click(toggle);
    expect(screen.queryByText('ledger account is inactive')).toBeNull();
  });

  it('says when there are no runs yet', () => {
    showRuns([]);
    render(<BillingRunsPanel />);
    expect(screen.getByText('No billing runs yet')).toBeTruthy();
  });

  it('says when the runs could not be loaded', () => {
    mocks.query = { data: undefined, isLoading: false, isError: true, error: new Error('Forbidden') };
    render(<BillingRunsPanel />);
    expect(screen.getByText(/Could not load billing runs/)).toBeTruthy();
  });

  it('says the runs are not available yet when the server has no such route', () => {
    mocks.query = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError(404, { message: 'Cannot GET /billing-runs', statusCode: 404 } as never),
    };
    render(<BillingRunsPanel />);
    expect(screen.getByText('Billing runs are not available yet on this server.')).toBeTruthy();
  });
});

describe('describeGenerateResult', () => {
  it('reports created and already-billed units', () => {
    expect(describeGenerateResult({ count: 3, skipped: 2 })).toBe('3 created, 2 already billed');
  });

  it('treats a missing skipped count as none', () => {
    expect(describeGenerateResult({ count: 1 })).toBe('1 created, 0 already billed');
  });
});
