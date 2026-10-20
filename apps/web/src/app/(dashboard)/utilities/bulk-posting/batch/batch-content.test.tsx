import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BatchContent } from './batch-content';
import { prepareRows } from './batch-rows';

/** UTIL-15 — Invoices in Batch: closing readings per meter, Preview (dry run) then Post. */

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn(), memorize: true as boolean | null }));
vi.mock('@/lib/api', () => ({ api: { get: mocks.get, post: mocks.post } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => ({ get: (key: string) => ({ block: 'A', meter_type: 'water' })[key] ?? null }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-utility-settings', () => ({ useUtilitySettings: () => ({ data: { utility_billing: { auto_post: true } } }) }));
vi.mock('@/components/ui/account-search-select', () => ({ AccountSearchSelect: () => null }));

const METERS = [
  { meter_id: 'm-1', meter_number: 'AW1', unit_id: 'u-1', unit_number: '101', block: 'A', last_reading_value: '100.00', last_reading_date: '2026-08-31' },
  { meter_id: 'm-2', meter_number: 'AW2', unit_id: 'u-2', unit_number: '102', block: 'A', last_reading_value: '200.00', last_reading_date: '2026-08-31' },
];

function renderGrid() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BatchContent />
    </QueryClientProvider>,
  );
}

describe('Invoices in Batch grid', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.get.mockImplementation(async () => ({ data: { memorize: mocks.memorize, tariff_error: null, meters: METERS } }));
  });

  it('previews the typed closing readings with nothing saved, then posts them', async () => {
    renderGrid();
    await waitFor(() => expect(screen.getByLabelText('Closing Reading, AW1')).toBeTruthy());
    expect(mocks.get.mock.calls[0][1].params).toMatchObject({ meter_type: 'water', block: 'A' });
    expect(screen.queryByLabelText('Opening Reading, AW1')).toBeNull();
    fireEvent.change(screen.getByLabelText('Closing Reading, AW1'), { target: { value: '112' } });
    mocks.post.mockResolvedValueOnce({
      data: { dry_run: true, memorize: true, readings_recorded: 0, bills_created: 0, invoices: null, rows: [{ row: 1, meter_id: 'm-1', meter_number: 'AW1', unit_number: '101', opening_reading: '100.00', closing_reading: '112.00', reading_date: '2026-09-30', consumption: '12.00', amount: '120.00', errors: [] }] },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });
    const [path, body] = mocks.post.mock.calls[0];
    expect(path).toBe('/utilities/batch-post');
    expect(body).toMatchObject({ meter_type: 'water', dry_run: true, post_now: true, rows: [{ meter_id: 'm-1', closing_reading: 112 }] });
    expect(screen.getByText('120.00')).toBeTruthy();
    expect(screen.getByText(/Nothing has been saved/)).toBeTruthy();

    mocks.post.mockResolvedValueOnce({
      data: { dry_run: false, memorize: true, readings_recorded: 1, bills_created: 1, invoices: { invoices_created: 1, bills_invoiced: 1, posted: true, invoices: [], skipped: [] }, rows: [{ row: 1, meter_id: 'm-1', meter_number: 'AW1', unit_number: '101', opening_reading: '100.00', closing_reading: '112.00', reading_date: '2026-09-30', consumption: '12.00', amount: '120.00', errors: [], bill_id: 'b-1' }] },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    });
    expect(mocks.post.mock.calls[1][1]).toMatchObject({ dry_run: false });
    expect(screen.getByText('Posted')).toBeTruthy();
  });

  it('types the opening reading only where Memorize Units is off', async () => {
    mocks.memorize = false;
    renderGrid();
    await waitFor(() => expect(screen.getByLabelText('Opening Reading, AW2')).toBeTruthy());
    mocks.memorize = true;
  });

  it('sends only rows with a closing reading and marks a value that is not a reading', () => {
    const prepared = prepareRows(
      METERS,
      { 'm-1': { opening: '90', closing: '1.234', date: '2026-09-30', comment: '' }, 'm-2': { opening: '150', closing: '210', date: '2026-09-29', comment: ' locked ' } },
      false,
    );
    expect(prepared.invalid).toEqual({ 'm-1': 'Closing Reading is not a number (at most two decimals)' });
    expect(prepared.rows).toEqual([{ meter_id: 'm-2', closing_reading: 210, reading_date: '2026-09-29', opening_reading: 150, comment: 'locked' }]);
    expect(prepareRows(METERS, { 'm-1': { opening: '90', closing: '5', date: 'd', comment: '' } }, true).rows[0]).not.toHaveProperty('opening_reading');
  });
});
