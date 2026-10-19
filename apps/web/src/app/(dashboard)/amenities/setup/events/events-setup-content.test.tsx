import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventsSetupContent } from './events-setup-content';

/**
 * Amenity & Event › Setup › Event (AMEN-12, screen AMEN-S3): the events
 * table with Invite on published events and Edit as a page.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const state = vi.hoisted(() => ({ invite: vi.fn(), toast: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: state.toast }) }));

function event(id: string, title: string, status: string) {
  return { id, title, status, event_date: '2030-11-01', start_time: '18:30:00', end_time: '21:00:00', location: 'Clubhouse lawn' };
}

vi.mock('@/hooks', () => ({
  useEvents: () => ({ isLoading: false, data: [event('ev-1', 'Diwali Mela', 'published'), event('ev-2', 'Yoga Week', 'draft')] }),
  useInviteEvent: () => ({ mutate: state.invite }),
}));

const rows = () => within(screen.getByRole('table', { name: 'Events' })).getAllByRole('row').slice(1);

describe('EventsSetupContent', () => {
  beforeEach(() => {
    state.invite.mockReset();
    state.toast.mockReset();
  });

  it('lists the events with their start, end and venue', () => {
    render(<EventsSetupContent />);

    expect(rows()).toHaveLength(2);
    expect(rows()[0].textContent).toContain('Diwali Mela');
    expect(rows()[0].textContent).toContain('18:30');
    expect(rows()[0].textContent).toContain('21:00');
    expect(rows()[0].textContent).toContain('Clubhouse lawn');
  });

  it('offers Invite on a published event only', () => {
    render(<EventsSetupContent />);

    expect(within(rows()[0]).getByRole('button', { name: 'Invite' })).toBeTruthy();
    expect(within(rows()[1]).queryByRole('button', { name: 'Invite' })).toBeNull();
  });

  it('invites and says how many residents were told', () => {
    state.invite.mockImplementation((_id: string, opts: { onSuccess: (r: { sent: number }) => void }) => opts.onSuccess({ sent: 42 }));
    render(<EventsSetupContent />);

    fireEvent.click(within(rows()[0]).getByRole('button', { name: 'Invite' }));

    expect(state.invite.mock.calls[0][0]).toBe('ev-1');
    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Invitation sent to 42 residents' }));
  });

  it('opens Add Event and Edit as pages', () => {
    render(<EventsSetupContent />);

    expect(screen.getByRole('link', { name: 'Add Event' }).getAttribute('href')).toBe('/amenities/events/new');
    expect(within(rows()[1]).getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/amenities/events/ev-2/edit');
  });
});
