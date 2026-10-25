import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { VendorInvoicePage } from './vendor-invoice-page';

/**
 * By Vendors › Invoice: the page sends no probe request. A server without
 * multi-line invoices answers the form's own head list 404 and the page
 * says "not available yet"; otherwise the form shows.
 */

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api, API_BASE_URL: 'http://api.test' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ vendorId: 'vendor-1' }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/(dashboard)/purchases/vendor-invoice/vendor-invoice-form', () => ({
  VendorInvoiceForm: ({ vendorId }: { vendorId: string }): ReactNode => <div>invoice form for {vendorId}</div>,
}));

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <VendorInvoicePage />
    </QueryClientProvider>,
  );
}

describe('VendorInvoicePage', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
  });
  afterEach(cleanup);

  it('shows the form and sends no probe', async () => {
    api.get.mockResolvedValue({ data: [], gst: { society_state_code: null, rate_options: [0, 18], pre_reform_rates: [], reform_date: '2025-09-22' } });
    renderPage();

    expect(screen.getByText('invoice form for vendor-1')).toBeTruthy();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/purchases/expense-heads/summary'));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('says not available yet when the server answers the head list 404', async () => {
    api.get.mockRejectedValue(new ApiError(404, { message: 'Cannot GET /purchases/expense-heads/summary' } as never));
    renderPage();

    expect(await screen.findByText('Posting vendor invoices with lines is not available yet on this server.')).toBeTruthy();
    expect(screen.queryByText(/invoice form for/)).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('keeps the form on any other error (the form shows it)', async () => {
    api.get.mockRejectedValue(new ApiError(500, { message: 'Server error' } as never));
    renderPage();

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.getByText('invoice form for vendor-1')).toBeTruthy();
  });
});
