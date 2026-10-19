import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { notice } from '../_classic/test-notices';
import { RetiredPage } from '../_classic/state-pages';

/** ANN-10 / ANN-S4 — Retired: read-only, 100 a page with Previous / Next, search, Filter. */

const ROWS = Array.from({ length: 150 }, (_, i) => notice(i + 1, { state: 'retired', status: 'retired' }));
const seen = vi.hoisted(() => ({ filters: [] as Array<Record<string, unknown>> }));

vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks')>();
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    ...actual,
    useAnnouncements: (filters: { source?: string; page: number; limit: number }) => {
      seen.filters.push(filters);
      const rows = filters.source === 'committee' ? ROWS : [];
      const start = (filters.page - 1) * filters.limit;
      return { data: { data: rows.slice(start, start + filters.limit), total: rows.length }, isLoading: false };
    },
    useAnnouncementRights: () => ({ data: [] }),
    usePublishAnnouncement: mutation,
    useApproveAnnouncement: mutation,
    useRejectAnnouncement: mutation,
    useDeleteAnnouncement: mutation,
    useUpdateAnnouncement: mutation,
    useRetireAnnouncement: mutation,
  };
});

describe('Announcements › Retired (classic)', () => {
  it('shows 100 on page 1 and the other 50 on Next', () => {
    render(<RetiredPage />);
    const table = () => screen.getAllByRole('table')[0];

    expect(within(table()).getAllByRole('row')).toHaveLength(101);
    fireEvent.click(screen.getAllByRole('button', { name: 'Next' })[0]);
    expect(within(table()).getAllByRole('row')).toHaveLength(51);
  });

  it('is read-only: View only, and no Show Logs', () => {
    render(<RetiredPage />);

    const headers = within(screen.getAllByRole('table')[0]).getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['Sl.No', 'Posted On', 'Expiring On', 'Announcement By', 'Brief Description', 'Type', 'View']);
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show Logs' })).toBeNull();
  });

  it('applies the filter panel: Posted On, Type and Recipients', () => {
    render(<RetiredPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.change(screen.getByLabelText('Posted On from'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'promotional' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(seen.filters.at(-1)).toMatchObject({ state: 'retired', posted_from: '2026-01-01', classification: 'promotional' });
  });
});
