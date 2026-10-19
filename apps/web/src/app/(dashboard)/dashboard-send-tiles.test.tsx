import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StandardSendNow } from './_dashboard/send-now-band';

/** ANN-09 — the standard dashboard's send-now tiles, in their order, above the cards. */

const mocks = vi.hoisted(() => ({ role: 'community_admin', sms: false }));

vi.mock('@/hooks', () => ({
  useNotificationChannels: () => ({ data: { email: true, sms: mocks.sms, sms_essential: false, sms_message_max: 120 } }),
  useEnabledFeatures: () => ({ data: undefined }),
}));
vi.mock('@/components/layout/classic/use-classic-menu', () => ({ currentMenuRole: () => mocks.role }));

describe('StandardSendNow', () => {
  it('shows an admin Instant Notification and Post Announcement, SMS once it is set up', () => {
    render(<StandardSendNow />);
    expect(screen.queryByText('SMS')).toBeNull();
    expect(screen.getByRole('link', { name: 'Send Instant Notification' }).getAttribute('href')).toBe(
      '/notifications?compose=1&channel=push',
    );
    expect(screen.getByRole('link', { name: 'Send Post Announcement' }).getAttribute('href')).toBe('/announcements?new=1');
  });

  it('adds SMS first when SMS is set up', () => {
    mocks.sms = true;
    render(<StandardSendNow />);

    const links = screen.getAllByRole('link').map((link) => link.getAttribute('aria-label'));
    expect(links).toEqual(['Send SMS', 'Send Instant Notification', 'Send Post Announcement']);
  });

  it('gives an accountant no SMS or Instant Notification', () => {
    mocks.role = 'accountant';
    mocks.sms = true;
    render(<StandardSendNow />);

    expect(screen.queryByText('Instant Notification')).toBeNull();
    expect(screen.queryByText('SMS')).toBeNull();
    expect(screen.getByText('Post Announcement')).toBeTruthy();
  });
});
