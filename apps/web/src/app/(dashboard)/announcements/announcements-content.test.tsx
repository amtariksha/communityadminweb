import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnnouncementsContent from './announcements-content';

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
