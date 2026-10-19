import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogueRow } from '@/components/reports/catalogue-fixture';
import { ReportRunPage } from '@/components/reports/run/report-run-page';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), downloadPost: vi.fn() } }));
vi.mock('@/lib/vocabulary', () => ({ useWord: () => (word: string) => word }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));
const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(nav.search) }));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const downloadPost = vi.mocked(api.downloadPost);

const PRESET = catalogueRow({ key: 'bank.cash_flow.previous_month', name: 'Cash Flow - Sep 2026', number: 4, section: 3, section_title: 'Bank & Cash', module: 'bank_cash' });
const WITH_OPTIONS = catalogueRow({
  key: 'gl.income_expenditure',
  name: 'Income & Expenditure',
  number: 2,
  params: [{ key: 'period', label: 'Period', type: 'date_range', required: true, default: 'current_fy' }],
});

const RESULT = {
  title: 'Cash Flow - Sep 2026',
  subtitle: 'Sep 2026',
  sections: [
    {
      columns: [
        { key: 'entry_date', label: 'Date', type: 'date' },
        { key: 'narration', label: 'Narration', type: 'text' },
        { key: 'inflow', label: 'Inflow', type: 'money' },
      ],
      rows: [
        { entry_date: '2026-09-02', narration: 'Maintenance from A-101', inflow: 2500 },
        { entry_date: '2026-09-05', narration: 'Maintenance from B-202', inflow: 3000 },
      ],
      totals: { label: 'Total', values: { inflow: 5500 } },
    },
  ],
};

function renderPage(key: string): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReportRunPage reportKey={key} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  nav.search = '';
  get.mockReset().mockResolvedValue({ data: [PRESET, WITH_OPTIONS] });
  post.mockReset().mockResolvedValue({ data: RESULT, run_id: 'run-1', total_rows: 2, truncated: false });
  downloadPost.mockReset().mockResolvedValue(new Blob(['x']));
});

describe('report run page (REP-05)', () => {
  it('runs a preset row on open, with no options panel', async () => {
    renderPage(PRESET.key);

    await screen.findByText('Maintenance from A-101');
    expect(post).toHaveBeenCalledWith('/report-catalogue/bank.cash_flow.previous_month/run', { params: {} });
    expect(screen.queryByRole('form', { name: 'Report options' })).toBeNull();
    const table = screen.getByRole('table', { name: 'Cash Flow - Sep 2026' });
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getAllByRole('cell')[0].textContent).toBe('1');
    expect(within(rows[rows.length - 1]).getByText('Total')).toBeTruthy();
  });

  it('waits for Fetch when the report takes options, then sends them', async () => {
    renderPage(WITH_OPTIONS.key);

    await screen.findByText('Choose the options and press Fetch');
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));

    await screen.findByText('Maintenance from A-101');
    expect(post).toHaveBeenCalledWith('/report-catalogue/gl.income_expenditure/run', { params: { period: 'current_fy' } });
  });

  it('says when the screen holds only the first 2,000 rows', async () => {
    post.mockResolvedValue({ data: RESULT, run_id: 'run-1', total_rows: 2500, truncated: true });
    renderPage(PRESET.key);

    expect(await screen.findByText('Showing the first 2 of 2,500 rows — export for all of them')).toBeTruthy();
  });

  it('exports the whole result through the export route with the same options', async () => {
    renderPage(WITH_OPTIONS.key);
    fireEvent.click(await screen.findByRole('button', { name: 'Fetch' }));
    await screen.findByText('Maintenance from A-101');

    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));

    await waitFor(() =>
      expect(downloadPost).toHaveBeenCalledWith('/report-catalogue/gl.income_expenditure/export', {
        params: { period: 'current_fy' },
        format: 'xlsx',
      }),
    );
  });

  it('shows the error code when the report could not be produced', async () => {
    post.mockRejectedValue(Object.assign(new Error('boom'), { status: 500, code: 'report_source_failed' }));
    renderPage(PRESET.key);

    expect(await screen.findByText('This report could not be produced (report_source_failed).')).toBeTruthy();
  });

  it('closes back to the module Reports page it was opened from', async () => {
    nav.search = 'from=ledger';
    renderPage(WITH_OPTIONS.key);

    const close = await screen.findByRole('link', { name: 'Close' });
    expect(close.getAttribute('href')).toBe('/accounts/reports');
    expect(screen.getByRole('link', { name: 'Reports' }).getAttribute('href')).toBe('/accounts/reports');
  });
});
