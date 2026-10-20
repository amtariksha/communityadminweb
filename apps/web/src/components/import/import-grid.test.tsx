import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ImportGrid } from './import-grid';

/** SB-13's on-screen door: typed rows go to the same preview and commit as a file. */

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post, get: vi.fn(), download: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

describe('ImportGrid', () => {
  it('sends the typed rows, numbered as in the grid, to preview and then to commit', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportGrid target={{ endpoint: '/purchases/imports', type: 'vendor_advance' }} title="Advance payments" columns={[{ key: 'vendor', label: 'Vendor' }, { key: 'amount', label: 'Amount' }]} applyLabel="Post" />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText('Vendor, row 2'), { target: { value: 'V-01' } });
    fireEvent.change(screen.getByLabelText('Amount, row 2'), { target: { value: '100' } });
    mocks.post.mockResolvedValueOnce({ data: { batch_id: 'b', type: 'vendor_advance', file_name: null, total_rows: 1, valid_rows: 1, error_rows: 0, skip_rows: 0, invalid_rows: 'block', can_apply: true, already_applied: null, rows: [{ row: 2, action: 'post', errors: [], values: { vendor: 'V-01', amount: '100' } }] } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });
    expect(mocks.post).toHaveBeenCalledWith('/purchases/imports/vendor_advance/preview', { rows: [{}, { vendor: 'V-01', amount: '100' }] });
    mocks.post.mockResolvedValueOnce({ data: { batch_id: 'b', type: 'vendor_advance', total_rows: 1, created: 0, updated: 0, posted: 1, skipped: 0, error_rows: 0, rows: [], totals: {} } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Post 1 row' }));
    });
    expect(mocks.post.mock.calls[1]).toEqual(['/purchases/imports/vendor_advance/apply', { rows: [{}, { vendor: 'V-01', amount: '100' }], batch_id: 'b' }]);
    expect(screen.getByText('Done: 1 posted.')).toBeTruthy();
  });
});
