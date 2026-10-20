import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ExcelContent } from './excel-content';

/** UTIL-16 — Invoices using Excel sends the sheet with the period and meter type as the upload's options. */

const mocks = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post, get: mocks.get, download: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => (key === 'meter_type' ? 'electricity' : null) }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-utility-settings', () => ({ useUtilitySettings: () => ({ data: undefined }) }));
vi.mock('@/components/ui/account-search-select', () => ({ AccountSearchSelect: () => null }));

describe('Invoices using Excel', () => {
  it('previews the readings sheet through the utility_readings import with the batch options', async () => {
    mocks.get.mockResolvedValue({ data: [], total: 0 });
    mocks.post.mockResolvedValue({ data: { batch_id: 'b', type: 'utility_readings', file_name: 'r.xlsx', total_rows: 0, valid_rows: 0, error_rows: 0, skip_rows: 0, invalid_rows: 'skip', can_apply: false, already_applied: null, rows: [] } });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ExcelContent />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Electricity readings to invoices/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Upload meter readings: file'), { target: { files: [new File(['x'], 'r.xlsx')] } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });
    const [path, body] = mocks.post.mock.calls[0];
    expect(path).toBe('/utilities/imports/utility_readings/preview');
    const options = JSON.parse((body as FormData).get('options') as string);
    expect(options).toMatchObject({ meter_type: 'electricity', post_now: false });
    expect(options.period_from <= options.period_to).toBe(true);
    expect(options).not.toHaveProperty('ledger_account_id');
  });
});
