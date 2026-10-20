import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { ImportPreview } from '@/hooks/use-imports';
import { ImportFlow } from './import-flow';

/** SB-13: template → file → preview with per-row errors → commit → result, and the not-deployed state. */

const mocks = vi.hoisted(() => ({ post: vi.fn(), download: vi.fn(), get: vi.fn(), addToast: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post, download: mocks.download, get: mocks.get } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

const preview = (overrides: Partial<ImportPreview> = {}): ImportPreview => ({
  batch_id: 'batch-1',
  type: 'vehicles',
  file_name: 'v.csv',
  total_rows: 2,
  valid_rows: 1,
  error_rows: 1,
  skip_rows: 0,
  invalid_rows: 'skip',
  can_apply: true,
  already_applied: null,
  rows: [
    { row: 2, action: 'update', note: 'will update', errors: [], values: { vehicle_number: 'KA01AB1234' } },
    { row: 3, action: 'create', errors: [{ field: 'unit_number', message: 'No unit Z-9' }], values: { vehicle_number: 'KA02', unit_number: 'Z-9' } },
  ],
  ...overrides,
});

function renderFlow(options?: Record<string, unknown>) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ImportFlow
        target={{ endpoint: '/parking/imports', type: 'vehicles' }}
        title="Vehicles"
        columns={[{ key: 'vehicle_number', label: 'Vehicle No' }, { key: 'unit_number', label: 'Unit No' }]}
        options={options}
      />
    </QueryClientProvider>,
  );
}

async function chooseAndPreview(): Promise<File> {
  const file = new File(['Vehicle No\nKA01'], 'v.csv', { type: 'text/csv' });
  fireEvent.change(screen.getByLabelText('Vehicles: file'), { target: { files: [file] } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  });
  return file;
}

describe('ImportFlow', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.download.mockReset();
    mocks.addToast.mockReset();
  });

  it('previews every row with its result and errors, then commits the same file with the preview id', async () => {
    mocks.post.mockResolvedValueOnce({ data: preview() });
    renderFlow({ meter_type: 'water' });
    const file = await chooseAndPreview();

    const [path, body] = mocks.post.mock.calls[0];
    expect(path).toBe('/parking/imports/vehicles/preview');
    expect((body as FormData).get('file')).toBe(file);
    expect((body as FormData).get('options')).toBe('{"meter_type":"water"}');
    expect(screen.getByText('2 rows read · 1 ready · 1 row with errors')).toBeTruthy();
    expect(screen.getByText('No unit Z-9')).toBeTruthy();
    expect(screen.getByText('will update')).toBeTruthy();

    mocks.post.mockResolvedValueOnce({ data: { batch_id: 'batch-1', type: 'vehicles', total_rows: 2, created: 0, updated: 1, posted: 0, skipped: 0, error_rows: 1, rows: [], totals: {} } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Import 1 row' }));
    });
    const [applyPath, applyBody] = mocks.post.mock.calls[1];
    expect(applyPath).toBe('/parking/imports/vehicles/apply');
    expect((applyBody as FormData).get('batch_id')).toBe('batch-1');
    expect(screen.getByText('Done: 1 updated · 1 not imported (errors).')).toBeTruthy();
  });

  it('keeps the commit off while a blocking import has a bad row, and says a posted file will not post again', async () => {
    mocks.post.mockResolvedValueOnce({ data: preview({ invalid_rows: 'block', can_apply: false }) });
    renderFlow();
    await chooseAndPreview();
    expect((screen.getByRole('button', { name: 'Import 1 row' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Nothing can be posted until every row is right/)).toBeTruthy();
  });

  it('shows the rows the server refused when the commit is blocked', async () => {
    mocks.post.mockResolvedValueOnce({ data: preview({ invalid_rows: 'block', error_rows: 0, can_apply: true }) });
    renderFlow();
    await chooseAndPreview();
    const refused = new ApiError(400, {
      message: 'One row has an error.',
      code: 'import_rows_invalid',
      details: { rows: [{ row: 5, action: 'create', errors: [{ message: 'Debits and credits differ' }], values: {} }] },
    } as never);
    mocks.post.mockRejectedValueOnce(refused);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Import 1 row' }));
    });
    expect(screen.getByRole('table', { name: 'Rows with errors' })).toBeTruthy();
    expect(screen.getByText('Debits and credits differ')).toBeTruthy();
  });

  it('says the upload is not available yet when the API answers 404', async () => {
    mocks.post.mockRejectedValueOnce(new ApiError(404, { message: 'Not found' } as never));
    renderFlow();
    await chooseAndPreview();
    await waitFor(() => expect(screen.getByText(/This upload is not available yet/)).toBeTruthy());
  });

  it('downloads the template for the type', async () => {
    mocks.download.mockResolvedValueOnce(new Blob(['x']));
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    renderFlow();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Excel template' }));
    });
    expect(mocks.download).toHaveBeenCalledWith('/parking/imports/vehicles/template', { params: { format: 'xlsx' } });
  });

  it('refuses a file over 4.5 MB before sending it', () => {
    renderFlow();
    const big = new File([new Uint8Array(5 * 1024 * 1024)], 'big.xlsx');
    fireEvent.change(screen.getByLabelText('Vehicles: file'), { target: { files: [big] } });
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'The file is larger than 4.5 MB' }));
    expect((screen.getByRole('button', { name: 'Preview' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
