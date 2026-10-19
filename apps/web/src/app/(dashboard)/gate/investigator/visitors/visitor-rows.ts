import type { Visitor } from '@/hooks/use-gate';

export const VISITOR_STATUS_LABELS: Readonly<Record<string, string>> = {
  pending: 'Pending',
  approved: 'Approved',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  rejected: 'Rejected',
  expired: 'Expired',
};

/** Still inside past the expected stay (GATE-S4: the row shows in red). */
export function isOverrun(visitor: Visitor, stayMinutes: number, now: number = Date.now()): boolean {
  if (visitor.status !== 'checked_in' || visitor.checked_out_at || !visitor.checked_in_at) return false;
  return now - new Date(visitor.checked_in_at).getTime() > stayMinutes * 60_000;
}
