/** Badge colours of a request's priority and status, shared by every request screen. */

export type BadgeTone = 'secondary' | 'default' | 'warning' | 'destructive' | 'success';

export function priorityTone(priority: string): BadgeTone {
  switch (priority) {
    case 'medium':
      return 'default';
    case 'high':
      return 'warning';
    case 'urgent':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'open':
      return 'warning';
    case 'in_progress':
      return 'default';
    // Waiting on someone outside the desk (HELP-14).
    case 'on_hold':
    case 'awaiting_resident':
      return 'secondary';
    case 'resolved':
      return 'success';
    case 'reopened':
      return 'destructive';
    default:
      return 'secondary';
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const COMPLETED = new Set(['resolved', 'closed']);

interface AgedRequest {
  status: string;
  created_at: string;
  closed_at?: string | null;
  resolved_at?: string | null;
  age_days?: number | null;
}

/**
 * Whole days a request has been open, as the server counts them
 * (`age_days`); worked out here for an older server that does not send it.
 */
export function requestAgeDays(request: AgedRequest, now: Date = new Date()): number {
  if (typeof request.age_days === 'number') return request.age_days;
  const end = COMPLETED.has(request.status)
    ? new Date(request.closed_at ?? request.resolved_at ?? now)
    : now;
  return Math.max(0, Math.floor((end.getTime() - new Date(request.created_at).getTime()) / DAY_MS));
}
