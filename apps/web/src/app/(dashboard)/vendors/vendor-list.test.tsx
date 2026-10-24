import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VendorList, vendorExportParams } from './vendor-list';

/**
 * The standard Vendors list exported only the rows of the page on screen;
 * its export now asks GET /vendors/export for the whole filtered list (SB-04).
 */

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
const download = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { download } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));
vi.mock('@/hooks', () => ({
  useVendors: () => ({
    data: { data: [{ id: 'v1', name: 'Pumpline Service Co.', pan: null, gstin: null, is_active: true, phone: null }], total: 45 },
    isLoading: false,
  }),
}));

describe('Vendors list export', () => {
  it('sends the status and search, not a page', () => {
    expect(vendorExportParams('all', '')).toEqual({});
    expect(vendorExportParams('inactive', 'pump')).toEqual({ is_active: 'false', search: 'pump' });
    expect(vendorExportParams('active', '')).toEqual({ is_active: 'true' });
  });

  it('downloads the whole filtered list from the server', async () => {
    download.mockResolvedValue(new Blob(['x']));
    render(<VendorList onOpen={vi.fn()} onEdit={vi.fn()} onDeactivate={vi.fn()} deactivating={false} />);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    });

    expect(download).toHaveBeenCalledWith('/vendors/export', { params: { is_active: 'true', format: 'xlsx' } });
  });
});
