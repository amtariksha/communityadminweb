import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetsBulkUpload } from './assets/bulk-upload/assets-bulk-upload';
import { InventoryBulkUpload } from './inventory/bulk-upload/inventory-bulk-upload';

/** ASSET-15 — the two Bulk Upload tabs, each to its import, blocked on a bad row. */

const mocks = vi.hoisted(() => ({ post: vi.fn(), role: 'community_admin' }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post, get: vi.fn().mockResolvedValue({ data: [], total: 0 }), download: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('next/navigation', () => ({ usePathname: () => '/asset-inventory/assets/bulk-upload', useSearchParams: () => new URLSearchParams() }));

const renderWith = (node: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);

describe('Asset & Inventory › Bulk Upload', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.role = 'community_admin';
  });

  it('previews the assets sheet and keeps Add off while a category is unknown', async () => {
    renderWith(<AssetsBulkUpload />);
    fireEvent.change(screen.getByLabelText('Bulk Upload Assets: file'), { target: { files: [new File(['x'], 'assets.xlsx')] } });
    mocks.post.mockResolvedValueOnce({
      data: { batch_id: 'b', type: 'assets', file_name: 'assets.xlsx', total_rows: 10, valid_rows: 9, error_rows: 1, skip_rows: 0, invalid_rows: 'block', can_apply: false, already_applied: null,
        rows: [{ row: 6, action: 'create', errors: [{ field: 'category', message: 'Unknown category "Spaceship"' }], values: { name: 'Asset E', category: 'Spaceship' } }] },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });
    expect(mocks.post.mock.calls[0][0]).toBe('/assets/imports/assets/preview');
    expect(screen.getByText('Unknown category "Spaceship"')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Add 9 rows' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('sends the inventory sheet to the materials import, and is read-only for an auditor', () => {
    mocks.role = 'auditor';
    renderWith(<InventoryBulkUpload />);
    expect((screen.getByLabelText('Bulk Upload Inventory: file') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('Your role cannot run this upload.')).toBeTruthy();
  });
});
