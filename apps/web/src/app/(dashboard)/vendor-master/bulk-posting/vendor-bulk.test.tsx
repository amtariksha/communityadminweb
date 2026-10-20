import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import VendorBulkPostingPage from './page';
import { VendorUploadPage } from './vendor-upload-page';

/** VEND-09 / VEND-S4 — Add Vendors in Bulk: two lists, each its own import. */

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post, get: vi.fn().mockResolvedValue({ data: [], total: 0 }), download: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/finance-roles', () => ({ canWriteFinance: () => true }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/vendor-master/bulk-posting/non-member-income', useSearchParams: () => new URLSearchParams() }));

describe('Add Vendors in Bulk', () => {
  it('links the two lists', () => {
    render(<VendorBulkPostingPage />);
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/vendor-master/bulk-posting/expense',
      '/vendor-master/bulk-posting/non-member-income',
    ]);
  });

  it('sends the non-member income sheet to the party import', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <VendorUploadPage list="non-member-income" />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText('Vendors For Non Member Income: file'), { target: { files: [new File(['x'], 'parties.csv')] } });
    mocks.post.mockResolvedValueOnce({ data: { batch_id: 'b', type: 'non_member_party', file_name: 'parties.csv', total_rows: 0, valid_rows: 0, error_rows: 0, skip_rows: 0, invalid_rows: 'skip', can_apply: false, already_applied: null, rows: [] } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });
    expect(mocks.post.mock.calls[0][0]).toBe('/customers/imports/non_member_party/preview');
  });
});
