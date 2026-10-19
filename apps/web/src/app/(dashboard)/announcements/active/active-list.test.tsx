import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notice } from '../_classic/test-notices';
import { ActivePage } from '../_classic/state-pages';

/** ANN-10 / ANN-S3 — Active: two sections, the columns in their order, Delete retires. */

const state = vi.hoisted(() => ({ retire: vi.fn(), rights: [] as Array<Record<string, unknown>> }));

vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  getUser: () => ({ id: 'u-me', isSuperAdmin: false, societies: [] }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks')>();
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    ...actual,
    useAnnouncements: (filters: { source?: string }) => ({
      data: { data: filters.source === 'committee' ? [notice(1)] : [], total: filters.source === 'committee' ? 1 : 0 },
      isLoading: false,
    }),
    useAnnouncementRights: () => ({ data: state.rights }),
    usePublishAnnouncement: mutation,
    useApproveAnnouncement: mutation,
    useRejectAnnouncement: mutation,
    useDeleteAnnouncement: mutation,
    useUpdateAnnouncement: mutation,
    useRetireAnnouncement: () => ({ mutate: state.retire, isPending: false }),
  };
});

beforeEach(() => {
  state.retire.mockClear();
  state.rights = [];
});

describe('Announcements › Active (classic)', () => {
  it('lists Current Active Announcements and Member Announcements', () => {
    render(<ActivePage />);

    expect(screen.getByRole('heading', { name: 'Current Active Announcements' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Member Announcements' })).toBeTruthy();
    expect(screen.getByText('There are no active announcements.')).toBeTruthy();
  });

  it('shows exactly their columns, in order', () => {
    render(<ActivePage />);

    const table = screen.getAllByRole('table')[0];
    const headers = within(table).getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual([
      'Sl.No', 'Posted On', 'Expiring On', 'Announcement Recipients', 'Block', 'Announcement By',
      'Brief Description', 'Type', 'View', 'Edit Expiry', 'Delete',
    ]);
    expect(within(table).getByText('All Owners of Block A')).toBeTruthy();
    expect(within(table).getByText('Official')).toBeTruthy();
  });

  it('retires a notice on Delete after the confirmation', () => {
    render(<ActivePage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(screen.getByText(/This moves the notice to Retired/)).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(state.retire).toHaveBeenCalledWith({ id: 'n-1', reason: undefined }, expect.anything());
  });

  it('hides Edit Expiry from someone without Set Expiry once anyone holds it', () => {
    state.rights = [{ user_id: 'u-other', can_set_expiry: true }];
    render(<ActivePage />);

    expect(screen.queryByRole('button', { name: 'Edit Expiry' })).toBeNull();
  });
});
