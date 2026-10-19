import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnnouncementsContent, { exportRows } from './announcements-content';
import type { Announcement } from '@/hooks';
import { dateIST } from '@/lib/date';

/** DASH-07 — `/announcements?new=1` opens the New Announcement form on load. */

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/announcements',
  useRouter: () => ({ replace: nav.replace }),
}));

vi.mock('@/hooks', () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    useAnnouncements: () => ({ data: { data: [], total: 0 }, isLoading: false }),
    useCreateAnnouncement: mutation,
    useUpdateAnnouncement: mutation,
    usePublishAnnouncement: mutation,
    useDeleteAnnouncement: mutation,
  };
});

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props}>{children}</select>
  ),
}));

describe('AnnouncementsContent — ?new=1', () => {
  beforeEach(() => {
    nav.search = '';
    nav.replace.mockClear();
  });

  it('opens the New Announcement dialog and drops the parameter from the URL', () => {
    nav.search = 'new=1';

    render(<AnnouncementsContent />);

    expect(screen.getByRole('heading', { name: 'New Announcement' })).toBeTruthy();
    expect(nav.replace).toHaveBeenCalledWith('/announcements');
  });

  it('stays closed without the parameter', () => {
    render(<AnnouncementsContent />);

    expect(screen.queryByRole('heading', { name: 'New Announcement' })).toBeNull();
    expect(nav.replace).not.toHaveBeenCalled();
  });
});

/** ANN-01 — the form offers only what can be saved, and the export fills Status. */
describe('AnnouncementsContent — ANN-01', () => {
  beforeEach(() => {
    nav.search = '';
  });

  it('offers no "Security" category, in the filter or the form', () => {
    nav.search = 'new=1';
    render(<AnnouncementsContent />);

    const filter = document.getElementById('announcement-category') as HTMLSelectElement;
    const form = document.getElementById('form-category') as HTMLSelectElement;
    for (const select of [filter, form]) {
      expect(within(select).queryByText('Security')).toBeNull();
    }
    expect(within(document.getElementById('form-audience') as HTMLSelectElement).getByText('Staff')).toBeTruthy();
  });

  it('says the notice expires at the end of the chosen day', () => {
    nav.search = 'new=1';
    render(<AnnouncementsContent />);

    expect(screen.getByText('Expires at the end of this day')).toBeTruthy();
  });

  it('exports the Status the table shows', () => {
    const base = { title: 'Notice', expires_at: null } as unknown as Announcement;
    const rows = exportRows([
      { ...base, id: 'a', published_at: '2026-10-01T05:00:00Z' },
      { ...base, id: 'b', published_at: null },
      { ...base, id: 'c', published_at: '2026-01-01T05:00:00Z', expires_at: '2026-02-01T18:29:59Z' },
    ]);

    expect(rows.map((r) => r.status)).toEqual(['Published', 'Draft', 'Expired']);
  });

  it('shows a stored expiry back as its India date', () => {
    expect(dateIST('2026-10-20T18:29:59.000Z')).toBe('2026-10-20');
  });
});
