import type { StatusRoute } from '@/components/layout/menu/status-menu';
import type { MeetingState } from '@/hooks/use-meeting-lists';

/** Meetings › Open and Closed (SB-05, PROJ-10): each a route under /governance/meetings. */
export interface MeetingStateRoute extends StatusRoute {
  slug: MeetingState;
  emptyText: string;
}

export const MEETINGS_BASE = '/governance/meetings';

export const MEETING_STATES: readonly MeetingStateRoute[] = [
  { slug: 'open', label: 'Open', emptyText: 'There are no open meetings.' },
  { slug: 'closed', label: 'Closed', emptyText: 'There are no closed meetings.' },
];

/** Whether a meeting is in a state: Open = scheduled; Closed = completed or cancelled. */
export function inState(status: string, state: MeetingState): boolean {
  return state === 'open' ? status === 'scheduled' : status !== 'scheduled';
}
