import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingNotificationsCard } from './meeting-notifications-card';

/** SetUp › Meeting notifications (PROJ-42, PROJ-43): off until a community admin switches them on. */

const mocks = vi.hoisted(() => ({ role: vi.fn(), save: vi.fn(), query: vi.fn() }));
vi.mock('@/hooks/use-meeting-invites', () => ({
  isMeetingRouteMissing: (error: { status?: number } | undefined) => error?.status === 404 || error?.status === 400,
  useMeetingNoticeSettings: () => mocks.query(),
  useSaveMeetingNoticeSettings: () => ({ mutateAsync: mocks.save, isPending: false }),
}));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

describe('MeetingNotificationsCard', () => {
  beforeEach(() => {
    mocks.save.mockReset().mockResolvedValue({});
    mocks.query.mockReturnValue({ data: { invitations_enabled: false, reminders_enabled: false } });
  });

  it('lets the community admin switch invitations on', async () => {
    mocks.role.mockReturnValue('community_admin');
    render(<MeetingNotificationsCard />);

    fireEvent.click(screen.getByLabelText(/Send meeting invitations/));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ invitations_enabled: true, reminders_enabled: false }));
  });

  it('shows a committee member the switches read-only', () => {
    mocks.role.mockReturnValue('committee_member');
    render(<MeetingNotificationsCard />);

    expect((screen.getByLabelText(/Send meeting reminders/) as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();
  });

  it('says not available yet on an older API', () => {
    mocks.role.mockReturnValue('community_admin');
    mocks.query.mockReturnValue({ error: { status: 400 } });
    render(<MeetingNotificationsCard />);

    expect(screen.getByText('Meeting notifications are not available yet.')).toBeTruthy();
  });
});
