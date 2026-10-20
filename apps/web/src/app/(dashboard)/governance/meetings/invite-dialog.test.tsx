import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeetingItem } from '@/hooks/use-meetings';
import { InviteDialog, invitedMessage } from './invite-dialog';

/**
 * Invite (PROJ-42, screen PROJ-S10): the audience and the named invitees;
 * Send Invitations stays off while a community admin has not switched
 * invitations on; the toast says how many were reached.
 */

const mocks = vi.hoisted(() => ({ settings: vi.fn(), send: vi.fn(), addToast: vi.fn() }));
vi.mock('@/hooks/use-meeting-invites', () => ({
  isMeetingRouteMissing: (error: { status?: number } | undefined) => error?.status === 404,
  useMeetingNoticeSettings: () => mocks.settings(),
  useSendInvitations: () => ({ mutateAsync: mocks.send, isPending: false }),
}));
vi.mock('@/hooks/use-meetings', () => ({
  useMeeting: () => ({
    data: {
      audience: 'owners',
      invitees: [
        { user_id: 'u-1', name: 'Asha Test', source: 'named', invited_at: null, attended: false },
        { user_id: 'u-2', name: 'Ravi Test', source: 'audience', invited_at: '2026-10-20T10:00:00Z', attended: false },
      ],
    },
  }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

const MEETING = { id: 'm-1', title: 'Owners meeting', meeting_date: '2026-11-02', start_time: '18:00:00' } as MeetingItem;

describe('InviteDialog', () => {
  beforeEach(() => {
    mocks.send.mockReset().mockResolvedValue({ invited: 3 });
    mocks.addToast.mockClear();
  });

  it('says how many were reached', () => {
    expect(invitedMessage(0)).toBe('Everyone has already been invited.');
    expect(invitedMessage(1)).toBe('Invited 1 person.');
    expect(invitedMessage(3)).toBe('Invited 3 people.');
  });

  it('shows the audience and the named invitees, and sends', async () => {
    mocks.settings.mockReturnValue({ data: { invitations_enabled: true, reminders_enabled: false } });
    render(<InviteDialog meeting={MEETING} onClose={vi.fn()} />);

    expect(screen.getByText('Only Owners')).toBeTruthy();
    expect(screen.getByText('Asha Test — not invited yet')).toBeTruthy();
    expect(screen.queryByText(/Ravi Test/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Send Invitations' }));

    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith('m-1'));
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Invited 3 people.' }));
  });

  it('keeps Send Invitations off while invitations are switched off', () => {
    mocks.settings.mockReturnValue({ data: { invitations_enabled: false, reminders_enabled: false } });
    render(<InviteDialog meeting={MEETING} onClose={vi.fn()} />);

    expect((screen.getByRole('button', { name: 'Send Invitations' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toMatch(/switched off/);
  });

  it('says not available yet on an API without invitations', () => {
    mocks.settings.mockReturnValue({ error: { status: 404 } });
    render(<InviteDialog meeting={MEETING} onClose={vi.fn()} />);

    expect(screen.getByText('Invitations are not available yet.')).toBeTruthy();
  });
});
