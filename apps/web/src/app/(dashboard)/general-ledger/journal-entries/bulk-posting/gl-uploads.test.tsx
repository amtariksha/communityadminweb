import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GL_JOURNAL_COLUMNS } from '../../gl-imports';
import { BulkPostingPage } from './bulk-posting-page';
import { GlUploadPage } from './gl-upload-page';

/** GL-24 — Bulk Posting offers both uploads; each opens the SB-13 flow, as a file or as a grid. */

const mocks = vi.hoisted(() => ({ door: null as string | null, post: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/general-ledger/journal-entries/bulk-posting/journal-entries',
  useSearchParams: () => new URLSearchParams(mocks.door ? `door=${mocks.door}` : ''),
}));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post, get: vi.fn().mockResolvedValue({ data: [], total: 0 }), download: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/finance-roles', () => ({ canWriteFinance: () => true }));

function renderUpload() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <GlUploadPage type="gl_journal" title="Batch Upload Journal Entries" description="x" columns={GL_JOURNAL_COLUMNS} closeTo="/x" />
    </QueryClientProvider>,
  );
}

describe('General Ledger bulk posting uploads', () => {
  beforeEach(() => {
    mocks.door = null;
    mocks.post.mockReset();
  });

  it('links the opening balance and journal entry uploads from Bulk Posting', () => {
    render(<BulkPostingPage />);
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/general-ledger/journal-entries/bulk-posting/opening-balances');
    expect(hrefs).toContain('/general-ledger/journal-entries/bulk-posting/journal-entries');
  });

  it('opens the Excel upload by default and the grid with door=grid', () => {
    renderUpload();
    expect(screen.getByLabelText('Batch Upload Journal Entries: file')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Type in a grid' }).getAttribute('href')).toBe('/general-ledger/journal-entries/bulk-posting/journal-entries?door=grid');
  });

  it('shows the journal whose debits and credits differ on its rows and keeps Post off', async () => {
    mocks.door = 'grid';
    renderUpload();
    fireEvent.change(screen.getByLabelText('Journal No., row 1'), { target: { value: 'J1' } });
    mocks.post.mockResolvedValueOnce({
      data: {
        batch_id: 'b', type: 'gl_journal', file_name: null, total_rows: 1, valid_rows: 0, error_rows: 1, skip_rows: 0, invalid_rows: 'block', can_apply: false, already_applied: null,
        rows: [{ row: 1, action: 'post', errors: [{ message: 'Debits and credits differ (300.00 against 250.00)' }], values: { journal_no: 'J1' } }],
      },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    });
    expect(mocks.post.mock.calls[0][0]).toBe('/ledger/imports/gl_journal/preview');
    expect(screen.getByText('Debits and credits differ (300.00 against 250.00)')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Post 0 rows' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
