import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingsList } from './meetings-list';

/**
 * Meetings › Open / Closed (PROJ-10): the state is the route, the search
 * has a scope, open rows carry Edit and Meeting Minutes, closed rows View.
 */

const nav = vi.hoisted(() => ({ pathname: '/governance/meetings/open' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T): T => value }));
const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/hooks/use-meeting-lists', () => ({ useMeetingList: (filters: unknown) => mocks.list(filters) }));

const MEETING = {
  id: 'm-1',
  title: 'Water tank cleaning',
  meeting_date: '2026-10-25',
  start_time: '19:00:00',
  end_time: '20:00:00',
  status: 'scheduled',
  created_by_name: 'Asha Test',
};

describe('MeetingsList', () => {
  beforeEach(() => {
    nav.pathname = '/governance/meetings/open';
    mocks.list.mockReset().mockReturnValue({ isLoading: false, data: { data: [MEETING], total: 1, counts: { open: 1, closed: 0 } } });
  });

  it('lists open meetings with Initiated by, Edit and Meeting Minutes', () => {
    render(<MeetingsList />);

    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'open', scope: 'all' }));
    expect(screen.getByText('Asha Test')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/governance/meetings/m-1/edit');
    expect(screen.getByRole('link', { name: 'Meeting Minutes' }).getAttribute('href')).toBe('/governance/meetings/m-1/minutes');
  });

  it('searches within the chosen scope', () => {
    render(<MeetingsList />);

    fireEvent.click(screen.getByLabelText('Minutes'));
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'lift' } });
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'lift', scope: 'minutes', page: 1 }));
  });

  it('shows closed meetings as View only', () => {
    nav.pathname = '/governance/meetings/closed';
    mocks.list.mockReturnValue({ isLoading: false, data: { data: [{ ...MEETING, status: 'completed' }], total: 1, counts: { open: 0, closed: 1 } } });
    render(<MeetingsList />);

    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'closed' }));
    expect(screen.getByRole('link', { name: 'View' }).getAttribute('href')).toBe('/governance/meetings/m-1');
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
  });

  it('keeps an older API’s closed meetings off the Open list', () => {
    mocks.list.mockReturnValue({ isLoading: false, data: { data: [MEETING, { ...MEETING, id: 'm-2', status: 'completed' }] } });
    render(<MeetingsList />);

    expect(screen.getAllByRole('link', { name: 'Edit' })).toHaveLength(1);
  });
});
