import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SendNowBand, sendNowTiles } from './send-now-band';

/** DASH-10 — the classic dashboard's SMS tile, only once SMS is a real channel. */

const mocks = vi.hoisted(() => ({ sms: false, role: 'community_admin' }));

vi.mock('@/hooks', () => ({
  useNotificationChannels: () => ({ data: { email: true, sms: mocks.sms, sms_essential: false, sms_message_max: 120 } }),
  useEnabledFeatures: () => ({ data: undefined }),
}));
vi.mock('@/components/layout/classic/use-classic-menu', () => ({ currentMenuRole: () => mocks.role }));

const ACCESS = { readsBooks: true, publishes: true, canOpen: () => true };

beforeEach(() => {
  mocks.sms = false;
  mocks.role = 'community_admin';
});

describe('SendNowBand (classic)', () => {
  it('has no SMS tile while SMS is not enabled', () => {
    render(<SendNowBand access={ACCESS} />);

    expect(screen.queryByText('SMS')).toBeNull();
    expect(screen.getByText('Instant Notification')).toBeTruthy();
  });

  it('shows SMS first once it is, opening the composer on General SMS', () => {
    mocks.sms = true;
    render(<SendNowBand access={ACCESS} />);

    const section = screen.getByRole('region', { name: 'Send now' });
    const titles = within(section).getAllByText(/^(SMS|Instant Notification|Post Announcement)$/).map((el) => el.textContent);
    expect(titles).toEqual(['SMS', 'Instant Notification', 'Post Announcement']);
    expect(screen.getByRole('link', { name: 'Send SMS' }).getAttribute('href')).toBe('/notifications?compose=1&channel=sms_general');
  });
});

describe('sendNowTiles', () => {
  const canOpen = () => true;

  it('gives an accountant only Post Announcement (no template rights)', () => {
    expect(sendNowTiles({ role: 'accountant', smsAvailable: true, canOpen }).map((t) => t.title)).toEqual(['Post Announcement']);
  });

  it('opens Instant Notification on App Notification', () => {
    const tiles = sendNowTiles({ role: 'committee_member', smsAvailable: false, canOpen });

    expect(tiles.map((t) => t.title)).toEqual(['Instant Notification', 'Post Announcement']);
    expect(tiles[0].href).toBe('/notifications?compose=1&channel=push');
  });

  it('leaves out a tile whose screen the role cannot open', () => {
    expect(sendNowTiles({ role: 'community_admin', smsAvailable: true, canOpen: (href) => !href.startsWith('/notifications') })
      .map((t) => t.title)).toEqual(['Post Announcement']);
  });
});
